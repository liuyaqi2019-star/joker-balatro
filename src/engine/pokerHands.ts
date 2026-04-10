export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank =
  | 'A'
  | 'K'
  | 'Q'
  | 'J'
  | '10'
  | '9'
  | '8'
  | '7'
  | '6'
  | '5'
  | '4'
  | '3'
  | '2';

export type Card = {
  id: string;
  suit: Suit;
  rank: Rank;
};

export type HandType =
  | 'HighCard'
  | 'Pair'
  | 'TwoPair'
  | 'ThreeKind'
  | 'Straight'
  | 'Flush'
  | 'FullHouse'
  | 'FourKind'
  | 'StraightFlush';

export type BaseScore = {
  handType: HandType;
  chips: number;
  mult: number;
  /** Cards that actually score chips for this hand (Balatro rule). */
  scoredCardIds: string[];
};

const RANK_VALUE: Record<Rank, number> = {
  A: 14,
  K: 13,
  Q: 12,
  J: 11,
  '10': 10,
  '9': 9,
  '8': 8,
  '7': 7,
  '6': 6,
  '5': 5,
  '4': 4,
  '3': 3,
  '2': 2,
};

// Scoring rule (custom): no base chips by hand type; only base mult.
const BASE: Record<HandType, { chips: number; mult: number }> = {
  HighCard: { chips: 0, mult: 1 },
  Pair: { chips: 0, mult: 2 },
  TwoPair: { chips: 0, mult: 2 },
  ThreeKind: { chips: 0, mult: 3 },
  Straight: { chips: 0, mult: 4 },
  Flush: { chips: 0, mult: 4 },
  FullHouse: { chips: 0, mult: 4 },
  FourKind: { chips: 0, mult: 7 },
  StraightFlush: { chips: 0, mult: 8 },
};

function isStraight(valuesDesc: number[]): { ok: boolean; high: number } {
  // valuesDesc sorted desc and unique.
  if (valuesDesc.length !== 5) return { ok: false, high: 0 };
  const a = valuesDesc;
  // Normal straight: x, x-1, ...
  let ok = true;
  for (let i = 0; i < 4; i++) {
    if (a[i] - 1 !== a[i + 1]) {
      ok = false;
      break;
    }
  }
  if (ok) return { ok: true, high: a[0] };
  // Wheel straight: A,5,4,3,2 => treat high as 5
  const wheel = [14, 5, 4, 3, 2];
  for (let i = 0; i < 5; i++) {
    if (a[i] !== wheel[i]) return { ok: false, high: 0 };
  }
  return { ok: true, high: 5 };
}

function cardChipValue(rank: Rank): number {
  if (rank === 'A') return 11;
  if (rank === 'K' || rank === 'Q' || rank === 'J') return 10;
  if (rank === '10') return 10;
  return Number(rank);
}

function pickScoredCards(args: {
  handType: HandType;
  hand: Card[];
  valuesDesc: number[];
  groups: Array<{ v: number; n: number }>;
  straightHigh: number;
}): string[] {
  const { handType, hand, valuesDesc, groups } = args;
  const byValue = new Map<number, Card[]>();
  for (const c of hand) {
    const v = RANK_VALUE[c.rank];
    const arr = byValue.get(v) ?? [];
    arr.push(c);
    byValue.set(v, arr);
  }

  const takeByValue = (v: number, count: number) =>
    (byValue.get(v) ?? []).slice(0, count).map((c) => c.id);

  switch (handType) {
    case 'HighCard': {
      const top = valuesDesc[0];
      return takeByValue(top, 1);
    }
    case 'Pair': {
      const pairV = groups.find((g) => g.n === 2)?.v ?? valuesDesc[0];
      return takeByValue(pairV, 2);
    }
    case 'TwoPair': {
      const pairs = groups.filter((g) => g.n === 2).map((g) => g.v);
      return [...takeByValue(pairs[0], 2), ...takeByValue(pairs[1], 2)];
    }
    case 'ThreeKind': {
      const v = groups.find((g) => g.n === 3)?.v ?? valuesDesc[0];
      return takeByValue(v, 3);
    }
    case 'FourKind': {
      const v = groups.find((g) => g.n === 4)?.v ?? valuesDesc[0];
      return takeByValue(v, 4);
    }
    case 'FullHouse':
    case 'Straight':
    case 'Flush':
    case 'StraightFlush': {
      // In Balatro, these hands score all 5 cards by default.
      return hand.map((c) => c.id);
    }
  }
}

export function evaluateHand(cards: Card[]): BaseScore {
  const hand = cards.slice(0, 5);
  if (hand.length === 0) {
    return { handType: 'HighCard', chips: 0, mult: 0, scoredCardIds: [] };
  }

  const suits = hand.map((c) => c.suit);
  const values = hand.map((c) => RANK_VALUE[c.rank]);
  values.sort((a, b) => b - a);

  const isFiveCardHand = hand.length === 5;
  const isFlush = isFiveCardHand && suits.every((s) => s === suits[0]);
  const unique = Array.from(new Set(values));
  unique.sort((a, b) => b - a);
  const straight = isFiveCardHand ? isStraight(unique) : { ok: false, high: 0 };

  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const groups = Array.from(counts.entries())
    .map(([v, n]) => ({ v, n }))
    .sort((a, b) => (b.n - a.n) || (b.v - a.v));

  const top = groups[0];
  const second = groups[1];

  let handType: HandType = 'HighCard';
  if (straight.ok && isFlush) handType = 'StraightFlush';
  else if (top.n === 4) handType = 'FourKind';
  else if (isFiveCardHand && top.n === 3 && second?.n === 2) handType = 'FullHouse';
  else if (isFlush) handType = 'Flush';
  else if (straight.ok) handType = 'Straight';
  else if (top.n === 3) handType = 'ThreeKind';
  else if (top.n === 2 && second?.n === 2) handType = 'TwoPair';
  else if (top.n === 2) handType = 'Pair';

  const base = BASE[handType];
  const scoredCardIds = pickScoredCards({
    handType,
    hand,
    valuesDesc: values,
    groups,
    straightHigh: straight.high,
  });
  const scoredCards = hand.filter((c) => scoredCardIds.includes(c.id));
  const chipsFromCards = scoredCards.reduce(
    (acc, c) => acc + cardChipValue(c.rank),
    0,
  );
  const chips = base.chips + chipsFromCards;
  const mult = base.mult;
  return { handType, chips, mult, scoredCardIds };
}

