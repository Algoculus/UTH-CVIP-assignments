import { FastifyInstance } from "fastify"
import { envConfig } from "@/config/env-config"

export async function faceRoutes(fastify: FastifyInstance) {
  // Proxy endpoint for face detection (used by enroll page)
  fastify.post("/face/detect", async (request, reply) => {
    const { image } = request.body as {
      image: string // Base64 encoded image
    }

    fastify.log.info("🔍 [FACE-DETECT] Received face detection request from frontend")

    try {
      // Call AI Service to detect faces
      const aiResponse = await fetch(
        `${envConfig.AI_SERVICE_URL}/face/detect`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image }),
        }
      )

      if (!aiResponse.ok) {
        const error = await aiResponse.json().catch(() => ({ detail: "Unknown error" }))
        fastify.log.error(
          { status: aiResponse.status, error },
          "❌ [FACE-DETECT] AI service failed"
        )
        return reply.code(aiResponse.status).send({
          error: "Failed to detect faces",
          details: error,
        })
      }

      const data = await aiResponse.json()
      fastify.log.info(
        { count: data.count },
        "✅ [FACE-DETECT] Face detection completed"
      )

      return data
    } catch (error) {
      fastify.log.error({ error }, "❌ [FACE-DETECT] Internal server error")
      return reply.code(500).send({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })
}

