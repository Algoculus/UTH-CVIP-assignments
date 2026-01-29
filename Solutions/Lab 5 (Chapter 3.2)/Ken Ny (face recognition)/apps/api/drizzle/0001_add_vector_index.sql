-- Create HNSW index for ANN (Approximate Nearest Neighbor) search on face embeddings
-- This index enables fast vector similarity search using cosine distance
CREATE INDEX IF NOT EXISTS "face_embeddings_embedding_idx" ON "face_embeddings" USING hnsw ("embedding" vector_cosine_ops);
