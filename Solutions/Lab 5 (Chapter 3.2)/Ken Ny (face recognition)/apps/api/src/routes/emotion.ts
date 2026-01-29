import { FastifyInstance } from "fastify"
import { envConfig } from "@/config/env-config"

export async function emotionRoutes(fastify: FastifyInstance) {
  // Analyze emotion for a single face
  fastify.post("/emotion/analyze", async (request, reply) => {
    const {
      image,
      face_box,
      language = "vi",
    } = request.body as {
      image: string // Base64 encoded image
      face_box?: number[] // Optional: [x, y, width, height]
      language?: string // 'vi' or 'en'
    }

    fastify.log.info(
      "😊 [EMOTION-ANALYZE] Received emotion analysis request from frontend"
    )

    try {
      // Call AI Service to analyze emotion
      const aiResponse = await fetch(
        `${envConfig.AI_SERVICE_URL}/emotion/analyze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image, face_box, language }),
        }
      )

      if (!aiResponse.ok) {
        const error = await aiResponse
          .json()
          .catch(() => ({ detail: "Unknown error" }))
        fastify.log.error(
          { status: aiResponse.status, error },
          "❌ [EMOTION-ANALYZE] AI service failed"
        )
        return reply.code(aiResponse.status).send({
          error: "Failed to analyze emotion",
          details: error,
        })
      }

      const data = await aiResponse.json()
      fastify.log.info(
        { emotion: data.emotion, confidence: data.confidence },
        "✅ [EMOTION-ANALYZE] Emotion analysis completed"
      )

      return data
    } catch (error) {
      fastify.log.error({ error }, "❌ [EMOTION-ANALYZE] Internal server error")
      return reply.code(500).send({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })

  // Analyze emotions for all faces in an image
  fastify.post("/emotion/analyze-batch", async (request, reply) => {
    const { image, language = "vi" } = request.body as {
      image: string // Base64 encoded image
      language?: string // 'vi' or 'en'
    }

    fastify.log.info(
      "😊 [EMOTION-BATCH] Received batch emotion analysis request from frontend"
    )

    try {
      // Call AI Service to analyze emotions
      const aiResponse = await fetch(
        `${envConfig.AI_SERVICE_URL}/emotion/analyze-batch`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image, language }),
        }
      )

      if (!aiResponse.ok) {
        const error = await aiResponse
          .json()
          .catch(() => ({ detail: "Unknown error" }))
        fastify.log.error(
          { status: aiResponse.status, error },
          "❌ [EMOTION-BATCH] AI service failed"
        )
        return reply.code(aiResponse.status).send({
          error: "Failed to analyze emotions",
          details: error,
        })
      }

      const data = await aiResponse.json()
      fastify.log.info(
        { count: data.count },
        "✅ [EMOTION-BATCH] Batch emotion analysis completed"
      )

      return data
    } catch (error) {
      fastify.log.error({ error }, "❌ [EMOTION-BATCH] Internal server error")
      return reply.code(500).send({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })

  // Deep emotion analysis with detailed insights
  fastify.post("/emotion/analyze-deep", async (request, reply) => {
    const {
      image,
      language = "vi",
      include_facial_features = true,
    } = request.body as {
      image: string
      language?: string
      include_facial_features?: boolean
    }

    fastify.log.info(
      "🔬 [EMOTION-DEEP] Received deep emotion analysis request from frontend"
    )

    try {
      // Call AI Service for deep analysis
      const aiResponse = await fetch(
        `${envConfig.AI_SERVICE_URL}/emotion/analyze-deep`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image, language, include_facial_features }),
        }
      )

      if (!aiResponse.ok) {
        const error = await aiResponse
          .json()
          .catch(() => ({ detail: "Unknown error" }))
        fastify.log.error(
          { status: aiResponse.status, error },
          "❌ [EMOTION-DEEP] AI service failed"
        )
        return reply.code(aiResponse.status).send({
          error: "Failed to perform deep emotion analysis",
          details: error,
        })
      }

      const data = await aiResponse.json()
      fastify.log.info(
        { count: data.count, type: data.analysis_type },
        "✅ [EMOTION-DEEP] Deep emotion analysis completed"
      )

      return data
    } catch (error) {
      fastify.log.error({ error }, "❌ [EMOTION-DEEP] Internal server error")
      return reply.code(500).send({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })

  // Get list of supported emotions
  fastify.get("/emotion/labels", async (request, reply) => {
    fastify.log.info("📋 [EMOTION-LABELS] Received emotion labels request")

    try {
      const aiResponse = await fetch(
        `${envConfig.AI_SERVICE_URL}/emotion/emotions`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      )

      if (!aiResponse.ok) {
        const error = await aiResponse
          .json()
          .catch(() => ({ detail: "Unknown error" }))
        fastify.log.error(
          { status: aiResponse.status, error },
          "❌ [EMOTION-LABELS] AI service failed"
        )
        return reply.code(aiResponse.status).send({
          error: "Failed to get emotion labels",
          details: error,
        })
      }

      const data = await aiResponse.json()
      fastify.log.info("✅ [EMOTION-LABELS] Emotion labels retrieved")

      return data
    } catch (error) {
      fastify.log.error({ error }, "❌ [EMOTION-LABELS] Internal server error")
      return reply.code(500).send({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })

  // Get music recommendations based on emotion
  fastify.post("/emotion/music-recommendations", async (request, reply) => {
    const {
      emotion,
      mood_score,
      count = 3,
    } = request.body as {
      emotion: string
      mood_score: number
      count?: number
    }

    fastify.log.info(
      { emotion, mood_score, count },
      "🎵 [MUSIC-RECOMMENDATIONS] Received music recommendation request"
    )

    try {
      const aiResponse = await fetch(
        `${envConfig.AI_SERVICE_URL}/emotion/music-recommendations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emotion, mood_score, count }),
        }
      )

      if (!aiResponse.ok) {
        const error = await aiResponse
          .json()
          .catch(() => ({ detail: "Unknown error" }))
        fastify.log.error(
          { status: aiResponse.status, error },
          "❌ [MUSIC-RECOMMENDATIONS] AI service failed"
        )
        return reply.code(aiResponse.status).send({
          error: "Failed to get music recommendations",
          details: error,
        })
      }

      const data = await aiResponse.json()
      fastify.log.info(
        { count: data.count },
        "✅ [MUSIC-RECOMMENDATIONS] Music recommendations retrieved"
      )

      return data
    } catch (error) {
      fastify.log.error(
        { error },
        "❌ [MUSIC-RECOMMENDATIONS] Internal server error"
      )
      return reply.code(500).send({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })

  // Get music database information
  fastify.get("/emotion/music-database", async (request, reply) => {
    fastify.log.info("🎵 [MUSIC-DATABASE] Received music database request")

    try {
      const aiResponse = await fetch(
        `${envConfig.AI_SERVICE_URL}/emotion/music-database`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      )

      if (!aiResponse.ok) {
        const error = await aiResponse
          .json()
          .catch(() => ({ detail: "Unknown error" }))
        fastify.log.error(
          { status: aiResponse.status, error },
          "❌ [MUSIC-DATABASE] AI service failed"
        )
        return reply.code(aiResponse.status).send({
          error: "Failed to get music database",
          details: error,
        })
      }

      const data = await aiResponse.json()
      fastify.log.info("✅ [MUSIC-DATABASE] Music database retrieved")

      return data
    } catch (error) {
      fastify.log.error({ error }, "❌ [MUSIC-DATABASE] Internal server error")
      return reply.code(500).send({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })
}
