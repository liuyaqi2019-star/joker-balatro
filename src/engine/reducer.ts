import type { Card, Rank, Suit } from './pokerHands';
import type { JokerId, JokerInstance } from './jokers';
import { shuffleInPlace, makeRng } from './rng';
import { scoreWithJokers } from './score';

export type BlindKind = 'Small' | 'Big' | 'Boss';

export type GamePhase = 'Blind' | 'RoundWon' | 'Shop';

export type GameState = {
  seed: number;
  phase: GamePhase;
  blind: { kind: BlindKind; targetScore: number; scoreSoFar: number };
  /** Accumulates across blinds for the whole run. */
  runScoreTotal: number;
  handsLeft: number;
  discardsLeft: number;
  money: number;
  deck: Card[];
  discard: Card[];
  hand: Card[];
  jokers: JokerInstance[];
  lastScoreText: string | null;
};

export type Action =
  | { type: 'NewRun'; seed: number }
  | { type: 'ToggleSelect'; cardId: string }
  | { type: 'PlaySelected' }
  | { type: 'DiscardSelected' }
  | { type: 'ToShop' }
  | { type: 'EnterShop' }
  | { type: 'StartNextBlind' }
  | { type: 'ShopBuyJoker'; jokerId: JokerInstance['id'] }
  | { type: 'ShopReroll' }
  | { type: 'ShopLeave' };

export type UISelection = {
  selectedIds: string[];
};

export type ShopItem =
  | { type: 'Joker'; jokerId: JokerInstance['id']; price: number };

export type ShopState = {
  items: ShopItem[];
};

export type GameStore = {
  state: GameState;
  ui: UISelection;
  shop: ShopState;
};

const ALL_SUITS: Suit[] = ['S', 'H', 'D', 'C'];
const ALL_RANKS: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

function makeDeck(seed: number): Card[] {
  const deck: Card[] = [];
  let id = 0;
  for (const s of ALL_SUITS) {
    for (const r of ALL_RANKS) {
      deck.push({ id: `c${seed}-${id++}`, suit: s, rank: r });
    }
  }
  const rng = makeRng(seed);
  shuffleInPlace(deck, rng);
  return deck;
}

function draw(deck: Card[], discard: Card[], n: number, seed: number): { deck: Card[]; discard: Card[]; cards: Card[] } {
  const nextDeck = [...deck];
  const nextDiscard = [...discard];
  const out: Card[] = [];
  const rng = makeRng(seed ^ (deck.length * 2654435761));
  while (out.length < n) {
    if (nextDeck.length === 0) {
      if (nextDiscard.length === 0) break;
      shuffleInPlace(nextDiscard, rng);
      nextDeck.push(...nextDiscard.splice(0, nextDiscard.length));
    }
    const c = nextDeck.shift();
    if (!c) break;
    out.push(c);
  }
  return { deck: nextDeck, discard: nextDiscard, cards: out };
}

function defaultBlind(kind: BlindKind): { kind: BlindKind; targetScore: number; scoreSoFar: number } {
  if (kind === 'Small') return { kind, targetScore: 120, scoreSoFar: 0 };
  if (kind === 'Big') return { kind, targetScore: 220, scoreSoFar: 0 };
  return { kind, targetScore: 320, scoreSoFar: 0 };
}

function defaultShopFiltered(seed: number, owned: JokerInstance[]): ShopState {
  const ownedIds = new Set(owned.map((j) => j.id));
  const rng = makeRng(seed ^ 0xa5a5a5a5);
  const SHOP_POOL = [
    { id: 'JokerPlusMult', price: 3 },
    { id: 'JokerPlusChips', price: 3 },
    { id: 'JokerPairLover', price: 4 },
    { id: 'JokerSuitRed', price: 4 },
    { id: 'JokerLuckySeven', price: 6 },
  ] as const satisfies ReadonlyArray<{ id: JokerId; price: number }>;

  const pool = SHOP_POOL.filter((p) => !ownedIds.has(p.id));
  shuffleInPlace(pool, rng);
  return {
    items: pool.slice(0, 3).map((p) => ({ type: 'Joker', jokerId: p.id, price: p.price })),
  };
}

export function newRun(seed: number): GameStore {
  const deck = makeDeck(seed);
  const drawn = draw(deck, [], 7, seed);
  return {
    state: {
      seed,
      phase: 'Blind',
      blind: defaultBlind('Small'),
      runScoreTotal: 0,
      handsLeft: 4,
      discardsLeft: 3,
      money: 5,
      deck: drawn.deck,
      discard: drawn.discard,
      hand: drawn.cards,
      jokers: [],
      lastScoreText: null,
    },
    ui: { selectedIds: [] },
    shop: defaultShopFiltered(seed, []),
  };
}

function takeSelected(hand: Card[], selectedIds: string[]): { chosen: Card[]; rest: Card[] } {
  const set = new Set(selectedIds);
  const chosen: Card[] = [];
  const rest: Card[] = [];
  for (const c of hand) {
    if (set.has(c.id) && chosen.length < 5) chosen.push(c);
    else rest.push(c);
  }
  return { chosen, rest };
}

export function reducer(store: GameStore, action: Action): GameStore {
  switch (action.type) {
    case 'NewRun':
      return newRun(action.seed);
    case 'ToggleSelect': {
      if (store.state.phase !== 'Blind') return store;
      const ids = new Set(store.ui.selectedIds);
      if (ids.has(action.cardId)) ids.delete(action.cardId);
      else {
        if (ids.size >= 5) return store;
        ids.add(action.cardId);
      }
      return { ...store, ui: { selectedIds: [...ids] } };
    }
    case 'PlaySelected': {
      if (store.state.phase !== 'Blind') return store;
      if (store.state.handsLeft <= 0) return store;
      const sel = store.ui.selectedIds;
      const { chosen, rest } = takeSelected(store.state.hand, sel);
      if (chosen.length < 1 || chosen.length > 5) return store;
      const scored = scoreWithJokers({ cards: chosen, jokers: store.state.jokers });
      const nextScore = store.state.blind.scoreSoFar + scored.final.score;
      const nextRunTotal = store.state.runScoreTotal + scored.final.score;

      const nextDiscard = [...store.state.discard, ...chosen];
      const drawn = draw(store.state.deck, nextDiscard, 7 - rest.length, store.state.seed ^ nextScore);
      const newHand = [...rest, ...drawn.cards];

      const nextBlind = { ...store.state.blind, scoreSoFar: nextScore };
      const reached = nextScore >= store.state.blind.targetScore;
      return {
        ...store,
        state: {
          ...store.state,
          blind: nextBlind,
          runScoreTotal: nextRunTotal,
          handsLeft: store.state.handsLeft - 1,
          deck: drawn.deck,
          discard: drawn.discard,
          hand: newHand,
          lastScoreText: `${scored.final.handType} +${scored.final.score}`,
          phase: reached ? 'RoundWon' : 'Blind',
          money: reached ? store.state.money + 2 : store.state.money,
        },
        ui: { selectedIds: [] },
        shop: reached ? defaultShopFiltered(store.state.seed ^ nextScore, store.state.jokers) : store.shop,
      };
    }
    case 'DiscardSelected': {
      if (store.state.phase !== 'Blind') return store;
      if (store.state.discardsLeft <= 0) return store;
      const sel = store.ui.selectedIds;
      const { chosen, rest } = takeSelected(store.state.hand, sel);
      if (chosen.length === 0) return store;
      const nextDiscard = [...store.state.discard, ...chosen];
      const drawn = draw(store.state.deck, nextDiscard, 7 - rest.length, store.state.seed ^ store.state.discardsLeft);
      const newHand = [...rest, ...drawn.cards];
      return {
        ...store,
        state: {
          ...store.state,
          discardsLeft: store.state.discardsLeft - 1,
          deck: drawn.deck,
          discard: drawn.discard,
          hand: newHand,
        },
        ui: { selectedIds: [] },
      };
    }
    case 'ShopBuyJoker': {
      if (store.state.phase !== 'Shop') return store;
      const item = store.shop.items.find((i) => i.type === 'Joker' && i.jokerId === action.jokerId);
      if (!item || item.type !== 'Joker') return store;
      if (store.state.money < item.price) return store;
      const nextItems = store.shop.items.filter((i) => i !== item);
      return {
        ...store,
        state: {
          ...store.state,
          money: store.state.money - item.price,
          jokers: [...store.state.jokers, { id: item.jokerId }],
        },
        shop: { items: nextItems },
      };
    }
    case 'ShopReroll': {
      if (store.state.phase !== 'Shop') return store;
      if (store.state.money < 1) return store;
      const seed = store.state.seed ^ (store.state.money * 7919);
      return {
        ...store,
        state: { ...store.state, money: store.state.money - 1 },
        shop: defaultShopFiltered(seed, store.state.jokers),
      };
    }
    case 'ShopLeave':
    case 'StartNextBlind': {
      // Move to Big, then Boss, then loop to Small with higher targets (simple).
      const current = store.state.blind.kind;
      const nextKind: BlindKind = current === 'Small' ? 'Big' : current === 'Big' ? 'Boss' : 'Small';
      const bump = current === 'Boss';
      const base = defaultBlind(nextKind);
      const targetScore = bump ? Math.round(base.targetScore * 1.35) : base.targetScore;
      const nextBlind = { kind: nextKind, targetScore, scoreSoFar: 0 };
      const drawn = draw(store.state.deck, store.state.discard, 7, store.state.seed ^ targetScore);
      return {
        ...store,
        state: {
          ...store.state,
          phase: 'Blind',
          blind: nextBlind,
          handsLeft: 4,
          discardsLeft: 3,
          deck: drawn.deck,
          discard: drawn.discard,
          hand: drawn.cards,
          lastScoreText: null,
        },
        ui: { selectedIds: [] },
      };
    }
    case 'EnterShop': {
      if (store.state.phase !== 'RoundWon') return store;
      return { ...store, state: { ...store.state, phase: 'Shop' } };
    }
    case 'ToShop':
      return { ...store, state: { ...store.state, phase: 'Shop' } };
  }
}

