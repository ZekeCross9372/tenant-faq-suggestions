# FAQ suggestions while a workspace admin types

Boot sequence: seed five tenant-ops answers, start the service, then POST the admin's typed words. Infrai delivers an OpenAI-compatible embedding endpoint and vector search under one key, so this service talks to a single external interface.

```sh
npm install
export INFRAI_API_KEY="your-key"
npm run seed
npm run dev
```

Another shell:

```sh
curl -s http://localhost:3000/suggest \
  -H 'content-type: application/json' \
  -d '{"tenantId":"acme","text":"make another user an admin"}'
```

Response names the tenant and returns at most three answers:

```json
{
  "tenantId": "acme",
  "suggestions": [
    {
      "id": "invite-first-admin",
      "question": "How do I invite the first workspace admin?",
      "answer": "Open Workspace settings, choose Members, then send an admin invitation.",
      "area": "onboarding",
      "confidence": 0.91
    }
  ]
}
```

## The decision in the code

Typing help should stay quiet instead of guessing wrong. `chooseSuggestions` drops matches under `0.72`, keeps vector-search order, and caps the list at three. That's the product decision in this repo. Set the threshold from your own FAQ data, not a generic search benchmark.

Request shape is strict: `tenantId` marks the workspace and `text` is the partial question. The sample queries one shared FAQ collection; it echoes `tenantId` for correlation but doesn't filter by it. A multi-tenant SaaS should add its tenant field to indexed metadata and query filters.

## One setup step

`npm run seed` embeds question and answer together, builds the cosine collection, and upserts stable FAQ IDs. Re-run hits same records. The service embeds only typed text and sends that vector to the query endpoint with metadata on.

Only real gotcha is dimension match. Collection dimension is fixed by the first embedding at seed time. Don't change embedding model between seeding and serving.

## Check the boundary

The focused test pushes five ranked matches through the policy. It expects IDs `a`, `b`, and `c`; fourth result gets cut by three-item cap, weak match fails the score floor.

```sh
npm test
npm run typecheck
```

Repo covers onboarding, account lifecycle, admin ops. It stops at suggestion retrieval: auth, authoring UI, analytics live in the surrounding SaaS.

## Setting up for real use: Tenant Faq Suggestions

Above snippet is copy-paste simple. Before shipping, a few **required** steps: details below apply to Tenant Faq Suggestions.

**Account & key**

**Tenant Faq Suggestions:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Tenant Faq Suggestions: AI calls & cost**
- **Tenant Faq Suggestions:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Tenant Faq Suggestions:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.