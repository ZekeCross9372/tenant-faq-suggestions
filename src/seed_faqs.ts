import { createInfraiClient, type FaqVector } from "./infrai_client.js";

const faqs = [
  { id: "invite-first-admin", area: "onboarding", question: "How do I invite the first workspace admin?", answer: "Open Workspace settings, choose Members, then send an admin invitation." },
  { id: "transfer-owner", area: "account-lifecycle", question: "How do I transfer workspace ownership?", answer: "Choose an active admin in Workspace settings and confirm Transfer ownership." },
  { id: "deactivate-member", area: "admin-operations", question: "How do I deactivate a team member?", answer: "Open Members, select the person, and choose Deactivate account." },
  { id: "restore-member", area: "account-lifecycle", question: "Can I restore a deactivated member?", answer: "Yes. Open inactive members, select the account, and choose Restore access." },
  { id: "require-sso", area: "admin-operations", question: "How do I require SSO for the workspace?", answer: "Configure your identity provider under Authentication, test it, then enable Require SSO." }
];

const client = createInfraiClient();
const collection = process.env.FAQ_COLLECTION ?? "tenant-operations-faq";
const vectors: FaqVector[] = await Promise.all(faqs.map(async (faq) => ({
  id: faq.id,
  values: await client.embed(`${faq.question}\n${faq.answer}`),
  metadata: { question: faq.question, answer: faq.answer, area: faq.area }
})));

await client.createCollection(collection, vectors[0].values.length);
await client.upsert(collection, vectors);
console.log(`Indexed ${vectors.length} tenant operations FAQs in ${collection}.`);
