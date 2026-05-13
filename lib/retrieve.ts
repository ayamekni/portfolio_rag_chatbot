import fs from "node:fs";
import path from "node:path";
import { pipeline } from "@xenova/transformers";

export type Embedding = number[];
export type IndexEntry = { id: string; text: string; embedding: Embedding };

export function cosineSimilarity(a: Embedding, b: Embedding): number {
  const len = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function topKByScore<T>(items: T[], score: (x: T) => number, k: number): T[] {
  return [...items]
    .map(item => ({ item, s: score(item) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, Math.max(0, k))
    .map(x => x.item);
}

export async function loadIndex(): Promise<IndexEntry[]> {
  try {
    const filePath = path.resolve(process.cwd(), "data", "index.json");
    if (!fs.existsSync(filePath)) {
      console.warn("Missing data/index.json — run python build_index_local.py");
      return [];
    }
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    console.error("Error reading index.json:", err);
    return [];
  }
}

// Cached embedder — loads the ONNX model once, reused on every request
let _embedder: Awaited<ReturnType<typeof pipeline>> | null = null;
async function getEmbedder() {
  if (!_embedder) {
    _embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return _embedder;
}

export async function retrieveContext(query: string, k: number): Promise<IndexEntry[]> {
  const index = await loadIndex();
  if (index.length === 0) return [];
  const embedder = await getEmbedder() as (input: string, opts: Record<string, unknown>) => Promise<{ data: Float32Array }>;
  const output = await embedder(query, { pooling: "mean", normalize: true });
  const qVec: number[] = Array.from(output.data);
  return topKByScore(index, e => cosineSimilarity(qVec, e.embedding), k);
}
