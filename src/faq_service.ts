import { createServer } from "node:http";
import { z } from "zod";
import { createInfraiClient, InfraiError } from "./infrai_client.js";
import { chooseSuggestions } from "./suggestion_policy.js";

const requestSchema = z.object({
  tenantId: z.string().min(1).max(80),
  text: z.string().trim().min(3).max(300)
}).strict();

const client = createInfraiClient();
const collection = process.env.FAQ_COLLECTION ?? "tenant-operations-faq";

function reply(response: import("node:http").ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > 16_384) throw new Error("BODY_TOO_LARGE");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/suggest") {
    reply(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const input = requestSchema.parse(await readJson(request));
    const embedding = await client.embed(input.text);
    const matches = await client.query(collection, embedding, 8);
    reply(response, 200, {
      tenantId: input.tenantId,
      suggestions: chooseSuggestions(matches)
    });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError || (error instanceof Error && error.message === "BODY_TOO_LARGE")) {
      reply(response, 400, { error: "Invalid request body" });
      return;
    }
    if (error instanceof InfraiError && error.status >= 400 && error.status < 500) {
      reply(response, error.status, { error: error.code });
      return;
    }
    console.error(error);
    reply(response, 502, { error: "Suggestion service unavailable" });
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`FAQ suggestion service listening on http://localhost:${port}`));
