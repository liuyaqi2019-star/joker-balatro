import type { Card } from './pokerHands';
import { evaluateHand } from './pokerHands';
import type { JokerInstance, ScoreLog } from './jokers';
import { applyJokersToScore } from './jokers';

export type ScoreBreakdown = {
  handType: string;
  chipsBase: number;
  multBase: number;
  chipsFinal: number;
  multFinal: number;
  score: number;
  scoredCardIds: string[];
};

export function scoreSelected(cards: Card[]): ScoreBreakdown {
  const base = evaluateHand(cards);
  const chipsFinal = base.chips;
  const multFinal = base.mult;
  const score = chipsFinal * multFinal;
  return {
    handType: base.handType,
    chipsBase: base.chips,
    multBase: base.mult,
    chipsFinal,
    multFinal,
    score,
    scoredCardIds: base.scoredCardIds,
  };
}

export function scoreWithJokers(args: {
  cards: Card[];
  jokers: JokerInstance[];
}): { base: ScoreBreakdown; final: ScoreBreakdown; logs: ScoreLog[] } {
  const base = scoreSelected(args.cards);
  const applied = applyJokersToScore({ jokers: args.jokers, cards: args.cards, base });
  return { base, final: applied.final, logs: applied.logs };
}

