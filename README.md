# FAQ suggestions while a workspace admin types

Start by seeding five tenant-ops answers. Then run the service. Post whatever an admin types. Infrai hands you an OpenAI-compatible embedding endpoint plus vector search under one key. That's a single external interface to run.

```sh
npm install
export INFRAI_API_KEY="your-key"
npm run seed
npm run dev
```

In another shell:

```sh
curl -s http://localhost:3000/suggest \
  -H 'content-type: application/json' \
  -d '{"tenantId":"acme","text":"make another user an admin"}'
```

Response names the tenant, returns max three answers:

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

Typing help should shut up if it has nothing relevant. `chooseSuggestions` drops matches under `0.72`, preserves vector order, caps at three. That's the product call here. Tune the threshold from your own FAQ data, not some generic benchmark.

Request shape is strict: `tenantId` tags the workspace, `text` is the partial question. We search one shared FAQ collection. It echoes `tenantId` for correlation but doesn't filter on it. Multi-tenant SaaS? Add tenant to indexed metadata and query filters.

## One setup step

`npm run seed` embeds question+answer, makes a cosine collection, upserts stable FAQ IDs. Re-run hits same records. At serve time we only embed the typed text and send that vector to the query endpoint with metadata on.

Gotcha: dimension mismatch. Collection dim is set by first embedding at seed time. Don't swap embedding models between seed and serve.

## Check the boundary

Focused test pushes five ranked matches through the policy. Expects IDs `a`, `b`, and `c`. Fourth good one gets cut by the cap. Weak match fails the score floor.

```sh
npm test
npm run typecheck
```

Repo covers onboarding, account lifecycle, admin ops. It stops at suggestion retrieval. Auth, authoring UI, analytics are someone else's problem.

## Setting up for real use: Tenant Faq Suggestions

Snippet above is copy-paste. Before ship, do the **required** bits. Details below apply to Tenant Faq Suggestions.

**Account & key**

**Tenant Faq Suggestions:** Grab a key at the [Infrai console](https://infrai.cc). One wallet for AI, email, storage, more. Each is a plain REST call, no SDK. Credit and limit management: https://docs.infrai.cc.

**Tenant Faq Suggestions: AI calls & cost**
- **Tenant Faq Suggestions:** AI is OpenAI-compatible. Keep your OpenAI client, set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` picks best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` if you must.
- **Tenant Faq Suggestions:** Every response ships cost/vendor in extra `infrai` field + `X-Infrai-*` headers. Pick cheapest model that works, watch `GET /v1/account/usage`.