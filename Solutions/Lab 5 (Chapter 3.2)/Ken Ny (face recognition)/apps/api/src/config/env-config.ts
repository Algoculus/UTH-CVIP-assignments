import { z } from "zod"
import dotenv from "dotenv"

dotenv.config()

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Server
  PORT: z
    .string()
    .default("8080")
    .transform(Number)
    .pipe(z.number().int().positive()),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // AI Service
  AI_SERVICE_URL: z.string().url(),

  // Recognition threshold (distance threshold for face recognition)
  // With real FaceNet model: 0.8 recommended (good balance)
  // Lower = stricter (fewer false positives, more false negatives)
  // Higher = more lenient (more false positives, fewer false negatives)
  RECOGNITION_THRESHOLD: z
    .string()
    .default("0.8")
    .transform(Number)
    .pipe(z.number().min(0).max(1)),
})

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(
        (err: z.ZodIssue) => `${err.path.join(".")}: ${err.message}`
      )
      throw new Error(
        `Environment variable validation failed:\n${missingVars.join("\n")}`
      )
    }
    throw error
  }
}

export const envConfig = parseEnv()

export type EnvConfig = z.infer<typeof envSchema>
