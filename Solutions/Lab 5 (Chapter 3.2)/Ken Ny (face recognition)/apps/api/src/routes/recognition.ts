import { FastifyInstance } from "fastify"
import { pool } from "../db/index"
import { envConfig } from "@/config/env-config"

export async function recognitionRoutes(fastify: FastifyInstance) {
  // WebSocket endpoint for realtime recognition
  fastify.get("/ws/recognition", { websocket: true }, (socket, request) => {
    fastify.log.info(
      {
        remoteAddress: request.socket.remoteAddress,
        remotePort: request.socket.remotePort,
      },
      "✅ WebSocket connection established"
    )

    socket.on("message", async (message: Buffer | string) => {
      try {
        const messageStr =
          typeof message === "string" ? message : message.toString()
        const data = JSON.parse(messageStr)

        if (data.type === "frame") {
          fastify.log.info("📸 [STEP 1] Received frame for recognition")

          // STEP 1: DETECT FACES FIRST (always do this to show bounding boxes)
          fastify.log.info(
            "🔍 [STEP 1.1] Calling AI service for face detection..."
          )
          let detectResponse
          try {
            detectResponse = await fetch(
              `${envConfig.AI_SERVICE_URL}/face/detect`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  image: data.image,
                }),
              }
            )

            fastify.log.info(
              { status: detectResponse.status, ok: detectResponse.ok },
              "✅ Face detection API response received"
            )
          } catch (fetchError) {
            fastify.log.error(
              { err: fetchError, aiServiceUrl: envConfig.AI_SERVICE_URL },
              "❌ Failed to connect to AI service for face detection"
            )
            socket.send(
              JSON.stringify({
                type: "error",
                message: `Failed to connect to AI service: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}`,
              })
            )
            return
          }

          if (!detectResponse.ok) {
            const errorData = await detectResponse.json().catch(() => ({}))
            fastify.log.error(
              {
                status: detectResponse.status,
                statusText: detectResponse.statusText,
                error: errorData,
              },
              "❌ Face detection failed"
            )
            socket.send(
              JSON.stringify({
                type: "error",
                message:
                  errorData.detail ||
                  `Face detection error: ${detectResponse.statusText}`,
              })
            )
            return
          }

          const detectResult = await detectResponse.json()
          const detectedFaces = detectResult.faces || []

          fastify.log.info(
            {
              facesDetected: detectedFaces.length,
              faces: detectedFaces.map(
                (f: { box: number[]; confidence: number }) => ({
                box: f.box,
                confidence: f.confidence,
                })
              ),
            },
            `✅ [STEP 1.2] Face detection completed - Found ${detectedFaces.length} face(s)`
          )

          // If no faces detected, return empty results
          if (detectedFaces.length === 0) {
            fastify.log.info("📭 No faces detected, returning empty results")
            socket.send(
              JSON.stringify({
                type: "recognition",
                results: [],
              })
            )
            return
          }

          // STEP 2: EXTRACT EMBEDDINGS FROM DETECTED FACES
          fastify.log.info(
            "🔍 [STEP 2] Extracting embeddings from detected faces..."
          )

          const recognitionResults: Array<{
            box: number[]
            embedding: number[] | null
            faceIndex: number
          }> = []

          // Extract embedding for each detected face
          for (let i = 0; i < detectedFaces.length; i++) {
            const face = detectedFaces[i]
            try {
          fastify.log.info(
                { faceIndex: i + 1, totalFaces: detectedFaces.length },
                `[STEP 2.${i + 1}] Extracting embedding for face ${i + 1}...`
          )

              // Extract embedding for this specific face by sending face_box
              // This ensures we get the embedding for the correct face when multiple faces are present
              const extractResponse = await fetch(
                `${envConfig.AI_SERVICE_URL}/face/extract-embedding`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  image: data.image,
                    face_box: face.box, // Send the specific face box
                }),
              }
            )

              if (!extractResponse.ok) {
                const errorData = await extractResponse.json().catch(() => ({}))
            fastify.log.error(
              {
                    faceIndex: i + 1,
                    status: extractResponse.status,
                error: errorData,
              },
                  `❌ Failed to extract embedding for face ${i + 1}`
                )
                recognitionResults.push({
                  box: face.box,
                  embedding: null,
                  faceIndex: i,
              })
                continue
          }

              const extractResult = await extractResponse.json()
              const embedding = extractResult.embedding

              if (
                !embedding ||
                !Array.isArray(embedding) ||
                embedding.length !== 512
              ) {
                fastify.log.error(
                  {
                    faceIndex: i + 1,
                    embeddingLength: embedding?.length,
                  },
                  `❌ Invalid embedding format for face ${i + 1}`
                )
                recognitionResults.push({
                  box: face.box,
                  embedding: null,
                  faceIndex: i,
                })
                continue
              }

          fastify.log.info(
            {
                  faceIndex: i + 1,
                  embeddingLength: embedding.length,
            },
                `✅ [STEP 2.${i + 1}] Embedding extracted for face ${i + 1}`
          )

              recognitionResults.push({
                box: face.box,
                embedding: embedding,
                faceIndex: i,
              })
            } catch (error) {
              fastify.log.error(
                { faceIndex: i + 1, error },
                `❌ Error extracting embedding for face ${i + 1}`
              )
              recognitionResults.push({
                box: face.box,
                embedding: null,
                faceIndex: i,
              })
            }
          }

          // STEP 3: QUERY DATABASE USING ANN (Approximate Nearest Neighbor)
          fastify.log.info("🗄️  [STEP 3] Querying database using ANN search...")

          const finalResults: Array<{
            box: number[]
                name: string
                distance: number
                confidence: number
            isMatch: boolean
            threshold: number
          }> = []

          for (const faceResult of recognitionResults) {
            // If embedding extraction failed, mark as Unknown
            if (!faceResult.embedding) {
              const box =
                Array.isArray(faceResult.box) && faceResult.box.length === 4
                  ? faceResult.box
                  : [0, 0, 100, 100]

              finalResults.push({
                box: box,
                name: "Unknown",
                distance: 1.0,
                confidence:
                  detectedFaces[faceResult.faceIndex]?.confidence || 0.9,
                isMatch: false,
                threshold: envConfig.RECOGNITION_THRESHOLD,
              })
              continue
            }

            try {
              // Query database using ANN with pgvector cosine distance operator
              // The <-> operator calculates cosine distance (1 - cosine similarity)
              // We use raw SQL because drizzle-orm doesn't have built-in support for pgvector operators
              const embeddingArray = faceResult.embedding
              // Format embedding as PostgreSQL vector literal: [1,2,3,...]
              const embeddingString = `[${embeddingArray.join(",")}]`

              fastify.log.info(
                {
                  faceIndex: faceResult.faceIndex + 1,
                  embeddingPreview: embeddingString.substring(0, 50) + "...",
                },
                `[STEP 3.${faceResult.faceIndex + 1}] Querying ANN for face ${faceResult.faceIndex + 1}...`
              )

              // Use raw SQL query with pgvector cosine distance operator
              // We use Pool directly for this query since drizzle-orm doesn't have built-in pgvector support
              // The embedding is validated (512-dim array of numbers from our AI service)

              // Format embedding array as PostgreSQL array literal for vector type
              // pgvector accepts array format: [1,2,3,...]::vector(512)
              const embeddingArrayLiteral = `[${embeddingArray.join(",")}]`

              // Query top 5 nearest neighbors to see the distance distribution
              const annQuery = `
                SELECT 
                  fe.embedding <-> $1::vector(512) AS distance,
                  u.user_id,
                  u.name,
                  fe.id as embedding_id
                FROM face_embeddings fe
                INNER JOIN users u ON fe.user_id = u.id
                ORDER BY fe.embedding <-> $1::vector(512)
                LIMIT 5
              `

              const annResults = await pool.query(annQuery, [
                embeddingArrayLiteral,
              ])

              if (annResults.rows.length === 0) {
                // No embeddings in database
                fastify.log.warn(
                  { faceIndex: faceResult.faceIndex + 1 },
                  `⚠️  No embeddings found in database for face ${faceResult.faceIndex + 1}`
                )
                const box =
                  Array.isArray(faceResult.box) && faceResult.box.length === 4
                    ? faceResult.box
                    : [0, 0, 100, 100]

                finalResults.push({
                  box: box,
                  name: "Unknown",
                  distance: 1.0,
                  confidence: 0.0,
                  isMatch: false,
                  threshold: envConfig.RECOGNITION_THRESHOLD,
                })
                continue
              }

              // Get the best match (closest neighbor)
              const bestMatch = annResults.rows[0] as {
                distance: number
                user_id: string
                name: string
                embedding_id: string
              }

              const distance = parseFloat(bestMatch.distance.toString())
              const similarity = 1.0 - distance // Cosine similarity
              const confidence = Math.max(0, Math.min(1, similarity)) // Clamp to [0, 1]
              const isMatch = distance <= envConfig.RECOGNITION_THRESHOLD

              const box =
                Array.isArray(faceResult.box) && faceResult.box.length === 4
                  ? faceResult.box
                  : [0, 0, 100, 100]

              // Log top 3 matches for debugging
              const top3Matches = annResults.rows
                .slice(0, 3)
                .map(
                  (row: {
                    distance: number
                    name: string
                    user_id: string
                  }) => ({
                    name: row.name,
                    userId: row.user_id,
                    distance: parseFloat(row.distance.toString()).toFixed(4),
                    confidence: (
                      (1.0 - parseFloat(row.distance.toString())) *
                      100
                    ).toFixed(1),
                  })
                )

              fastify.log.info(
                {
                  faceIndex: faceResult.faceIndex + 1,
                  bestMatch: {
                    userName: bestMatch.name,
                    userId: bestMatch.user_id,
                    distance: distance.toFixed(4),
                    similarity: similarity.toFixed(4),
                    confidence: (confidence * 100).toFixed(1) + "%",
                  },
                  top3Matches,
                  threshold: envConfig.RECOGNITION_THRESHOLD,
                  isMatch,
                },
                `[STEP 3.${faceResult.faceIndex + 1}] ANN result for face ${faceResult.faceIndex + 1}: ${bestMatch.name} (${isMatch ? "MATCH" : "NO MATCH"})`
              )

              finalResults.push({
                  box: box,
                name: isMatch ? bestMatch.name : "Unknown",
                distance: distance,
                confidence: confidence, // Always show actual confidence, not hardcoded 0.0
                isMatch: isMatch,
                threshold: envConfig.RECOGNITION_THRESHOLD,
              })
            } catch (dbError: unknown) {
              const error = dbError as { code?: string; message?: string }
              fastify.log.error(
                {
                  faceIndex: faceResult.faceIndex + 1,
                  error: dbError,
                  code: error?.code,
                },
                `❌ ANN query failed for face ${faceResult.faceIndex + 1}`
              )

              // On error, mark as Unknown
              const box =
                Array.isArray(faceResult.box) && faceResult.box.length === 4
                  ? faceResult.box
                  : [0, 0, 100, 100]

              finalResults.push({
                box: box,
                name: "Unknown",
                distance: 1.0,
                confidence:
                  detectedFaces[faceResult.faceIndex]?.confidence || 0.9,
                isMatch: false,
                threshold: envConfig.RECOGNITION_THRESHOLD,
              })
            }
          }

          const resultsWithNames = finalResults

          // STEP 6: SEND RESULTS TO CLIENT
          const responseData = {
            type: "recognition",
            results: resultsWithNames,
          }

          fastify.log.info(
            {
              resultsCount: resultsWithNames.length,
              threshold: envConfig.RECOGNITION_THRESHOLD,
              summary: resultsWithNames.map((r) => ({
                name: r.name,
                box: r.box,
                isMatch: r.isMatch,
                confidence: r.confidence,
              })),
            },
            `✅ [STEP 6] Sending ${resultsWithNames.length} final result(s) to client`
          )

          // Send recognition results back to client
          try {
            const responseString = JSON.stringify(responseData)
            fastify.log.info(
              { responseLength: responseString.length },
              "📡 [STEP 6.1] Sending WebSocket message..."
            )
            socket.send(responseString)
            fastify.log.info(
              "✅ [STEP 6.2] WebSocket message sent successfully!"
            )
            fastify.log.info("=".repeat(80))
          } catch (sendError) {
            fastify.log.error(
              { err: sendError },
              "❌ Failed to send WebSocket message"
            )
          }
        }
      } catch (error: unknown) {
        fastify.log.error(error)
        const errorMessage =
          error instanceof Error ? error.message : "Internal server error"
        socket.send(
          JSON.stringify({
            type: "error",
            message: errorMessage,
          })
        )
      }
    })

    socket.on("close", () => {
      fastify.log.info("🔌 WebSocket connection closed")
    })

    socket.on("error", (error: Error) => {
      fastify.log.error({ err: error }, "❌ WebSocket error")
    })
  })
}
