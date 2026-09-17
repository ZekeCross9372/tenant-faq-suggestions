import type { VectorMatch } from "./infrai_client.js";

export type FaqSuggestion = {
  id: string;
  question: string;
  answer: string;
  area: string;
  confidence: number;
};

export function chooseSuggestions(matches: VectorMatch[], minimumScore = 0.72): FaqSuggestion[] {
  return matches
    .filter((match) => match.score >= minimumScore)
    .slice(0, 3)
    .map((match) => ({
      id: match.id,
      question: match.metadata.question,
      answer: match.metadata.answer,
      area: match.metadata.area,
      confidence: Number(match.score.toFixed(3))
    }));
}
