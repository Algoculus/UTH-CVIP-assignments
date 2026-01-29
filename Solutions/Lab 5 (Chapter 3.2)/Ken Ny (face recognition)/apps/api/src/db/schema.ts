import { pgTable, text, uuid, vector, timestamp } from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  userId: text("user_id").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const faceEmbeddings = pgTable("face_embeddings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  embedding: vector("embedding", { dimensions: 512 }).notNull(), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type FaceEmbedding = typeof faceEmbeddings.$inferSelect
export type NewFaceEmbedding = typeof faceEmbeddings.$inferInsert
