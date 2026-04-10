import type { Card } from './pokerHands';
import type { ScoreBreakdown } from './score';

export type JokerTrigger = 'OnHandScored' | 'OnCardPlayed' | 'OnRoundEnd';

export type JokerId =
  | 'JokerPlusMult'
  | 'JokerPlusChips'
  | 'JokerPairLover'
  | 'JokerSuitRed'
  | 'JokerLuckySeven';

export type JokerDef = {
  id: JokerId;
  name: string;
  desc: string;
  price: number;
  triggers: JokerTrigger[];
};

export type JokerInstance = {
  id: JokerId;
};

export type ScoreLog = {
  jokerId: JokerId;
  title: string;
  detail: string;
};

export const JOKER_DEFS: JokerDef[] = [
  {
    id: 'JokerPlusMult',
    name: '小丑',
    desc: '结算时 +1 Mult',
    price: 3,
    triggers: ['OnHandScored'],
  },
  {
    id: 'JokerPlusChips',
    name: '筹码狂',
    desc: '结算时 +8 Chips',
    price: 3,
    triggers: ['OnHandScored'],
  },
  {
    id: 'JokerPairLover',
    name: '对子爱好者',
    desc: '如果是 Pair/TwoPair/FullHouse，额外 +1 Mult',
    price: 4,
    triggers: ['OnHandScored'],
  },
  {
    id: 'JokerSuitRed',
    name: '红心加成',
    desc: '每张红色牌（♥♦）+2 Chips',
    price: 4,
    triggers: ['OnCardPlayed', 'OnHandScored'],
  },
  {
    id: 'JokerLuckySeven',
    name: '幸运 7',
    desc: '若出牌中包含 7，结算时 Mult ×1.5（向下取整不做，直接保留一位小数）',
    price: 6,
    triggers: ['OnHandScored'],
  },
];

export function getJokerDef(id: JokerId): JokerDef {
  const d = JOKER_DEFS.find((j) => j.id === id);
  if (!d) throw new Error(`Unknown joker: ${id}`);
  return d;
}

export function applyJokersToScore(args: {
  jokers: JokerInstance[];
  cards: Card[];
  base: ScoreBreakdown;
}): { final: ScoreBreakdown; logs: ScoreLog[] } {
  let chips = args.base.chipsFinal;
  let mult = args.base.multFinal;
  const logs: ScoreLog[] = [];

  const hasRank = (r: string) => args.cards.some((c) => c.rank === r);
  const redCount = args.cards.filter((c) => c.suit === 'H' || c.suit === 'D').length;

  for (const j of args.jokers) {
    switch (j.id) {
      case 'JokerPlusMult': {
        mult += 1;
        logs.push({ jokerId: j.id, title: '+Mult', detail: '结算时 +1 Mult' });
        break;
      }
      case 'JokerPlusChips': {
        chips += 8;
        logs.push({ jokerId: j.id, title: '+Chips', detail: '结算时 +8 Chips' });
        break;
      }
      case 'JokerPairLover': {
        if (
          args.base.handType === 'Pair' ||
          args.base.handType === 'TwoPair' ||
          args.base.handType === 'FullHouse'
        ) {
          mult += 1;
          logs.push({ jokerId: j.id, title: '+Mult', detail: '对子相关牌型 +1 Mult' });
        }
        break;
      }
      case 'JokerSuitRed': {
        if (redCount > 0) {
          const add = redCount * 2;
          chips += add;
          logs.push({ jokerId: j.id, title: '+Chips', detail: `红色牌 ${redCount} 张：+${add} Chips` });
        }
        break;
      }
      case 'JokerLuckySeven': {
        if (hasRank('7')) {
          mult = Math.round(mult * 1.5 * 10) / 10;
          logs.push({ jokerId: j.id, title: '×Mult', detail: '包含 7：Mult ×1.5' });
        }
        break;
      }
    }
  }

  const score = Math.round(chips * mult);
  return {
    final: { ...args.base, chipsFinal: chips, multFinal: mult, score },
    logs,
  };
}

