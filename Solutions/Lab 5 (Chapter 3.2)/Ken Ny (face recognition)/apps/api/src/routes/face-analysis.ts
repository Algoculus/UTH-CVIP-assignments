import { FastifyInstance } from "fastify"
import { envConfig } from "@/config/env-config"

export async function faceAnalysisRoutes(fastify: FastifyInstance) {
  // Comprehensive face analysis
  fastify.post("/face-analysis/analyze", async (request, reply) => {
    const { image, modes, language = 'en' } = request.body as {
      image: string
      modes?: string[]
      language?: string
    }

    fastify.log.info(
      { modes, language },
      "🔍 [FACE-ANALYZE] Received face analysis request from frontend"
    )

    try {
      const aiResponse = await fetch(
        `${envConfig.AI_SERVICE_URL}/face-analysis/analyze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image, modes, language }),
        }
      )

      if (!aiResponse.ok) {
        const error = await aiResponse.json().catch(() => ({ detail: "Unknown error" }))
        fastify.log.error(
          { status: aiResponse.status, error },
          "❌ [FACE-ANALYZE] AI service failed"
        )
        return reply.code(aiResponse.status).send({
          error: "Failed to analyze face",
          details: error,
        })
      }

      const data = await aiResponse.json()
      fastify.log.info(
        { count: data.count, modes: data.modes_analyzed },
        "✅ [FACE-ANALYZE] Face analysis completed"
      )

      return data
    } catch (error) {
      fastify.log.error({ error }, "❌ [FACE-ANALYZE] Internal server error")
      return reply.code(500).send({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })

  // Compare two faces
  fastify.post("/face-analysis/compare", async (request, reply) => {
    const { image1, image2, threshold = 0.6 } = request.body as {
      image1: string
      image2: string
      threshold?: number
    }

    fastify.log.info("🔍 [FACE-COMPARE] Received face comparison request from frontend")

    try {
      const aiResponse = await fetch(
        `${envConfig.AI_SERVICE_URL}/face-analysis/compare`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image1, image2, threshold }),
        }
      )

      if (!aiResponse.ok) {
        const error = await aiResponse.json().catch(() => ({ detail: "Unknown error" }))
        fastify.log.error(
          { status: aiResponse.status, error },
          "❌ [FACE-COMPARE] AI service failed"
        )
        return reply.code(aiResponse.status).send({
          error: "Failed to compare faces",
          details: error,
        })
      }

      const data = await aiResponse.json()
      fastify.log.info(
        { similarity: data.similarity, is_same_person: data.is_same_person },
        "✅ [FACE-COMPARE] Face comparison completed"
      )

      return data
    } catch (error) {
      fastify.log.error({ error }, "❌ [FACE-COMPARE] Internal server error")
      return reply.code(500).send({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })

  // Get available analysis modes
  fastify.get("/face-analysis/modes", async (request, reply) => {
    fastify.log.info("📋 [FACE-MODES] Received analysis modes request")

    try {
      const aiResponse = await fetch(
        `${envConfig.AI_SERVICE_URL}/face-analysis/analysis-modes`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      )

      if (!aiResponse.ok) {
        const error = await aiResponse.json().catch(() => ({ detail: "Unknown error" }))
        fastify.log.error(
          { status: aiResponse.status, error },
          "❌ [FACE-MODES] AI service failed"
        )
        return reply.code(aiResponse.status).send({
          error: "Failed to get analysis modes",
          details: error,
        })
      }

      const data = await aiResponse.json()
      fastify.log.info("✅ [FACE-MODES] Analysis modes retrieved")

      return data
    } catch (error) {
      fastify.log.error({ error }, "❌ [FACE-MODES] Internal server error")
      return reply.code(500).send({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })
}
