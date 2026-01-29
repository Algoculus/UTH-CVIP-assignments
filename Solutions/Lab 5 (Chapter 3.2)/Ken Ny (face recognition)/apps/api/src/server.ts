import Fastify from "fastify"
import websocket from "@fastify/websocket"
import { envConfig } from "@/config/env-config"
import { userRoutes } from "./routes/users"
import { embeddingRoutes } from "./routes/embeddings"
import { recognitionRoutes } from "./routes/recognition"
import { faceRoutes } from "./routes/face"
import { emotionRoutes } from "./routes/emotion"
import { faceAnalysisRoutes } from "./routes/face-analysis"
import corsPlugin from "./plugins/cors"
import helmetPlugin from "./plugins/helmet"

async function build() {
  const fastify = Fastify({
    logger: true,
    bodyLimit: 50 * 1024 * 1024, // 50MB limit for image uploads
  })

  // Register plugins - WebSocket must be registered before helmet to avoid blocking upgrades
  await fastify.register(corsPlugin)
  await fastify.register(websocket)
  await fastify.register(helmetPlugin)

  // Health check
  fastify.get("/health", function (request, reply) {
    reply.send({ status: "ok", timestamp: new Date().toISOString() })
  })

  // Register routes
  await fastify.register(userRoutes)
  await fastify.register(embeddingRoutes)
  await fastify.register(recognitionRoutes)
  await fastify.register(faceRoutes)
  await fastify.register(emotionRoutes)
  await fastify.register(faceAnalysisRoutes)

  return fastify
}

async function start() {
  const fastify = await build()

  // Run the server!
  fastify.listen(
    { port: envConfig.PORT, host: envConfig.HOST },
    (err, address) => {
      if (err) {
        fastify.log.error(err)
        process.exit(1)
      }
      fastify.log.info(`Server is running on ${address}`)
    }
  )
}

start()

export default build
