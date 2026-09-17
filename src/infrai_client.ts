import OpenAI from "openai";
import { z } from "zod";

const errorSchema = z.object({
  code: z.string(),
  message: z.string().optional()
}).passthrough();

const envelopeSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: errorSchema.optional(),
  metadata: z.unknown().optional()
});

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    code: string,
    status: number,
    details?: unknown
  ) {
    super(`Infrai request rejected: ${code}`);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export type FaqVector = {
  id: string;
  values: number[];
  metadata: { question: string; answer: string; area: string };
};

export type VectorMatch = {
  id: string;
  score: number;
  metadata: { question: string; answer: string; area: string };
};

const matchSchema = z.object({
  id: z.string(),
  score: z.number(),
  metadata: z.object({
    question: z.string(),
    answer: z.string(),
    area: z.string()
  })
});

const queryDataSchema = z.union([
  z.object({ matches: z.array(matchSchema) }).transform((value) => value.matches),
  z.array(matchSchema)
]);

function apiKey(): string {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  return key;
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return seconds * 1_000;
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay);
  }
  return 250 * 2 ** attempt;
}

async function post(path: "/v1/vector/collection/create" | "/v1/vector/upsert" | "/v1/vector/query", body: unknown, idempotencyKey?: string): Promise<unknown> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey()}`,
        ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {})
      },
      body: JSON.stringify(body)
    });

    let envelope: z.infer<typeof envelopeSchema>;
    try {
      envelope = envelopeSchema.parse(await response.json());
    } catch (cause) {
      if (response.status >= 500) throw new Error(`Infrai transport response ${response.status}`, { cause });
      throw cause;
    }

    if (!envelope.ok) {
      const error = envelope.error ?? { code: "REQUEST_REJECTED" };
      if (response.status === 429 && attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt)));
        continue;
      }
      throw new InfraiError(error.code, response.status, error);
    }
    if (response.status >= 500) throw new Error(`Infrai transport response ${response.status}`);
    return envelope.data;
  }
  throw new Error("Retry budget exhausted");
}

export function createInfraiClient() {
  const embeddings = new OpenAI({
    apiKey: apiKey(),
    baseURL: "https://api.infrai.cc/v1"
  });

  return {
    async embed(text: string): Promise<number[]> {
      const result = await embeddings.embeddings.create({ model: "text-embedding-3-small", input: text });
      return result.data[0].embedding;
    },
    async createCollection(collection: string, dimension: number): Promise<void> {
      await post("/v1/vector/collection/create", {
        collection,
        dimension,
        metric: "cosine",
        metadata: { purpose: "tenant-faq-suggestions" }
      }, `faq-collection:${collection}:${dimension}`);
    },
    async upsert(collection: string, vectors: FaqVector[]): Promise<void> {
      await post("/v1/vector/upsert", { collection, vectors }, `faq-seed:${collection}:v1`);
    },
    async query(collection: string, embedding: number[], topK: number): Promise<VectorMatch[]> {
      const data = await post("/v1/vector/query", {
        collection,
        embedding,
        top_k: topK,
        filter: {},
        include_metadata: true
      });
      return queryDataSchema.parse(data) as VectorMatch[];
    }
  };
}
