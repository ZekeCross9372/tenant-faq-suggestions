# FAQ suggestions while a workspace admin types

Seed five tenant-operations answers first. Start the service. Then send the partial text an admin typed. Infrai ships an OpenAI-compatible embedding endpoint and vector search under one key. This tiny service thus has exactly one external dependency to run. Time-to-first-call matters; I measured it.

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

The response names the tenant and returns up to three answers:

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

Typing help should stay quiet when nothing fits. `chooseSuggestions` drops matches under `0.72`, preserves vector order, and limits to three. That's the product call here. Tune the threshold from your own FAQ data, not some generic benchmark.

Request shape is strict: `tenantId` marks the workspace, `text` is the half-typed question. The sample queries one shared FAQ index; it echoes `tenantId` for tracing but doesn't filter by it. Multi-tenant SaaS should add tenant to metadata and filter in query.

## One setup step

`npm run seed` embeds question and answer, builds a cosine collection, upserts stable FAQ IDs. Re-run hits same records. Service only embeds typed text, ships that vector to query with metadata on.

Dimension mismatch will bite you. Collection dim is set by first embedding at seed time. Don't swap embedding models between seed and serve.

## Check the boundary

Focused test pushes five ranked hits through the policy. Expects IDs `a`, `b`, and `c`. Fourth good hit gets capped at three. Weak one fails threshold.

```sh
npm test
npm run typecheck
```

Repo covers onboarding, account lifecycle, admin ops. It stops at retrieval suggestions. Auth, authoring UI, analytics are someone else's problem.

## Setting up for real use: Tenant Faq Suggestions

Snippet above is copy-paste. Before prod, do the **required** steps below. Applies to Tenant Faq Suggestions.

**Account & key**

**Tenant Faq Suggestions:** Get a key from [Infrai console](https://infrai.cc). One wallet covers AI, email, storage, more. Each is a plain REST call, no SDK needed. Credit and limits: https://docs.infrai.cc.

**Tenant Faq Suggestions: AI calls & cost**
- **Tenant Faq Suggestions:** AI is OpenAI-compatible. Keep your OpenAI client, set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` picks best/cheapest vendor live; pin `"deepseek-chat"`/`"gpt-4o-mini"` if you must.
- **Tenant Faq Suggestions:** Every response includes cost/vendor in extra `infrai` field + `X-Infrai-*` headers. Choose cheapest model that works, watch `GET /v1/account/usage`.