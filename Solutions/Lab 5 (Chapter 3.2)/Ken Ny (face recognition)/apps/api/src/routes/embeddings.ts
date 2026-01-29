import { FastifyInstance } from "fastify"
import { db } from "../db/index"
import { faceEmbeddings, users } from "../db/schema"
import { eq } from "drizzle-orm"
import { envConfig } from "@/config/env-config"

export async function embeddingRoutes(fastify: FastifyInstance) {
  // Save embedding for a user
  fastify.post("/embeddings", async (request, reply) => {
    const { userId, imageBase64 } = request.body as {
      userId: string
      imageBase64: string
    }

    fastify.log.info(
      { userId },
      "🔐 [EMBEDDING] Received embedding save request"
    )

    try {
      // Find user by userId (not id)
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.userId, userId))
        .limit(1)

      if (!user) {
        fastify.log.error({ userId }, "❌ [EMBEDDING] User not found")
        return reply.code(404).send({ error: "User not found" })
      }

      fastify.log.info(
        { userId, userName: user.name, dbId: user.id },
        "✓ [EMBEDDING] User found in database"
      )

      // Call AI Service to extract embedding
      fastify.log.info(
        "🔍 [EMBEDDING] Calling AI service to extract embedding..."
      )
      const aiResponse = await fetch(
        `${envConfig.AI_SERVICE_URL}/face/extract-embedding`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: imageBase64 }),
        }
      )

      if (!aiResponse.ok) {
        const error = await aiResponse.json()
        fastify.log.error(
          { status: aiResponse.status, error },
          "❌ [EMBEDDING] AI service failed to extract embedding"
        )
        return reply
          .code(500)
          .send({ error: "Failed to extract embedding", details: error })
      }

      const { embedding } = await aiResponse.json()

      fastify.log.info(
        {
          embeddingLength: embedding?.length,
          embeddingType: Array.isArray(embedding) ? "array" : typeof embedding,
          sampleValues: embedding?.slice(0, 5),
        },
        "📊 [EMBEDDING] Embedding extracted from AI service"
      )

      if (!embedding || !Array.isArray(embedding) || embedding.length !== 512) {
        fastify.log.error(
          { embeddingLength: embedding?.length },
          "❌ [EMBEDDING] Invalid embedding format"
        )
        return reply.code(500).send({
          error: `Invalid embedding format. Expected 512-dim array, got ${embedding?.length || "null"}`,
        })
      }

      // Save embedding to database
      fastify.log.info("💾 [EMBEDDING] Saving embedding to database...")
      const [newEmbedding] = await db
        .insert(faceEmbeddings)
        .values({
          userId: user.id,
          embedding: embedding,
        })
        .returning()

      if (!newEmbedding) {
        fastify.log.error("❌ [EMBEDDING] Failed to save embedding")
        return reply.code(500).send({ error: "Failed to save embedding" })
      }

      fastify.log.info(
        { embeddingId: newEmbedding.id, userId: user.id },
        "✅ [EMBEDDING] Embedding saved successfully"
      )

      return { embedding: newEmbedding, success: true }
    } catch (error) {
      fastify.log.error({ error }, "❌ [EMBEDDING] Internal server error")
      return reply.code(500).send({ error: "Internal server error" })
    }
  })

  // Get embeddings for a user
  fastify.get("/embeddings/user/:userId", async (request, reply) => {
    const { userId } = request.params as { userId: string }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1)

    if (!user) {
      return reply.code(404).send({ error: "User not found" })
    }

    const userEmbeddings = await db
      .select()
      .from(faceEmbeddings)
      .where(eq(faceEmbeddings.userId, user.id))

    return { embeddings: userEmbeddings }
  })
}
