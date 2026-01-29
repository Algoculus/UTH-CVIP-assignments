"use strict"

import cors from "@fastify/cors"
import { FastifyInstance } from "fastify"
import fp from "fastify-plugin"

/**
 * This plugins enables the use of CORS in a Fastify application.
 *
 * @see https://github.com/fastify/fastify-cors
 */
async function corsPlugin(fastify: FastifyInstance) {
  fastify.register(cors, {
    origin: "*",
    methods: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
    // origin: (origin, cb) => {
    //   const hostname = new URL(origin!).hostname
    //   if (hostname === "localhost") {
    //     //  Request from localhost will pass
    //     cb(null, true)
    //     return
    //   }
    //   // Generate an error on other origins, disabling access
    //   cb(new Error("Not allowed"), false)
    // },
  })
}

export default fp(corsPlugin)
