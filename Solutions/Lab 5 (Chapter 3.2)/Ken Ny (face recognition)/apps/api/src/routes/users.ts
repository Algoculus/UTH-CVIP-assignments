import { FastifyInstance } from "fastify"
import { db } from "../db/index"
import { users } from "../db/schema"
import { eq } from "drizzle-orm"

export async function userRoutes(fastify: FastifyInstance) {
  // Get all users
  fastify.get("/users", async () => {
    const allUsers = await db.select().from(users)
    return { users: allUsers }
  })

  // Get user by ID
  fastify.get("/users/:id", async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = await db.select().from(users).where(eq(users.id, id)).limit(1)

    if (user.length === 0) {
      return reply.code(404).send({ error: "User not found" })
    }

    return { user: user[0] }
  })

  // Create user
  fastify.post("/users", async (request, reply) => {
    const { name, userId } = request.body as { name: string; userId?: string }

    if (!name) {
      return reply.code(400).send({ error: "Name is required" })
    }

    // Check if user with same name already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.name, name))
      .limit(1)

    if (existingUser.length > 0) {
      return reply.code(409).send({
        error: "User with this name already exists",
        existingUser: existingUser[0],
      })
    }

    // Generate userId if not provided
    const finalUserId =
      userId ||
      `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    try {
      const [newUser] = await db
        .insert(users)
        .values({ name, userId: finalUserId })
        .returning()

      return { user: newUser }
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23505"
      ) {
        // Unique constraint violation
        return reply.code(409).send({ error: "UserId already exists" })
      }
      throw error
    }
  })

  // Delete user
  fastify.delete("/users/:id", async (request, reply) => {
    const { id } = request.params as { id: string }

    await db.delete(users).where(eq(users.id, id))

    return { success: true }
  })
}
