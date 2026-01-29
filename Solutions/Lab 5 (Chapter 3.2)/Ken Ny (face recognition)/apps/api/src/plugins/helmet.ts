"use strict"

import helmet from "@fastify/helmet"
import { FastifyInstance } from "fastify"
import fp from "fastify-plugin"

/**
 * This plugins adds important security headers for Fastify.
 *
 * @see https://github.com/fastify/fastify-helmet
 */
async function helmetPlugin(fastify: FastifyInstance) {
  fastify.register(helmet, {
    crossOriginResourcePolicy: false,
  })
}

export default fp(helmetPlugin)
