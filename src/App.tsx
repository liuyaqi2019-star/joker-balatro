import { useCallback, useMemo, useRef, useState } from 'react';
import './App.css';

import type { Suit } from './engine/pokerHands';
import { scoreWithJokers } from './engine/score';
import { JokerRow } from './components/JokerRow';
import { ShopView } from './components/ShopView';
import type { GameStore } from './engine/reducer';
import { newRun, reducer } from './engine/reducer';
import { SettingsSheet } from './components/SettingsSheet';
import { loadSettings, type Settings } from './lib/storage';

function suitSymbol(s: Suit): string {
  switch (s) {
    case 'S':
      return '♠';
    case 'H':
      return '♥';
    case 'D':
      return '♦';
    case 'C':
      return '♣';
  }
}

function isRed(s: Suit): boolean {
  return s === 'H' || s === 'D';
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function rankValue(rank: string): number {
  switch (rank) {
    case 'A':
      return 14;
    case 'K':
      return 13;
    case 'Q':
      return 12;
    case 'J':
      return 11;
    default:
      return Number(rank);
  }
}

function suitOrder(s: Suit): number {
  // Simple stable order for viewing
  switch (s) {
    case 'S':
      return 0;
    case 'H':
      return 1;
    case 'D':
      return 2;
    case 'C':
      return 3;
  }
}

export default function App() {
  const [store, setStore] = useState<GameStore>(() => newRun(12345));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const hand = store.state.hand;
  const selected = useMemo(() => new Set(store.ui.selectedIds), [store.ui.selectedIds]);
  const [dealTick, setDealTick] = useState(0);
  const jokers = store.state.jokers;
  const dragState = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    cardId: string | null;
  }>({ pointerId: null, startX: 0, startY: 0, cardId: null });

  const dispatch = useCallback((a: Parameters<typeof reducer>[1]) => {
    setStore((s) => reducer(s, a));
  }, []);

  const toggleSelect = useCallback((cardId: string) => dispatch({ type: 'ToggleSelect', cardId }), [dispatch]);
  const clearSelect = useCallback(() => {
    setStore((s) => ({ ...s, ui: { selectedIds: [] } }));
  }, []);

  const selectionCount = selected.size;
  const selectedCards = useMemo(() => hand.filter((c) => selected.has(c.id)).slice(0, 5), [hand, selected]);
  const breakdown = useMemo(() => {
    if (selectedCards.length < 1) return null;
    return scoreWithJokers({ cards: selectedCards, jokers });
  }, [selectedCards, jokers]);

  const displayHand = useMemo(() => {
    const arr = [...hand];
    if (settings.sortMode === 'suit') {
      arr.sort((a, b) => {
        const ds = suitOrder(a.suit) - suitOrder(b.suit);
        if (ds !== 0) return ds;
        return rankValue(b.rank) - rankValue(a.rank);
      });
    } else {
      arr.sort((a, b) => {
        const dr = rankValue(b.rank) - rankValue(a.rank);
        if (dr !== 0) return dr;
        return suitOrder(a.suit) - suitOrder(b.suit);
      });
    }
    return arr;
  }, [hand, settings.sortMode]);

  const fanLayout = useMemo(() => {
    const n = displayHand.length;
    const maxAngle = 22;
    const angles = displayHand.map((_, i) => {
      const t = n <= 1 ? 0 : i / (n - 1);
      return (t - 0.5) * 2 * maxAngle;
    });
    const spread = clamp(18 + n * 2.5, 24, 36);
    const lifts = displayHand.map((c) => (selected.has(c.id) ? -18 : 0));
    return { angles, spread, lifts };
  }, [displayHand, selected]);

  const onCardPointerDown = useCallback(
    (e: React.PointerEvent, cardId: string) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragState.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        cardId,
      };
    },
    [],
  );

  const onCardPointerMove = useCallback((e: React.PointerEvent) => {
    const st = dragState.current;
    if (st.pointerId !== e.pointerId) return;
    // No-op: per requirement, this version is tap-to-select only.
    void e;
  }, []);

  const onCardPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const st = dragState.current;
      if (st.pointerId !== e.pointerId) return;
      const cardId = st.cardId;
      dragState.current.pointerId = null;
      dragState.current.cardId = null;
      if (!cardId) return;

      // Tap toggles selection.
      toggleSelect(cardId);
    },
    [toggleSelect],
  );

  const canInteract = store.state.phase === 'Blind';
  const canPlay =
    canInteract &&
    selectedCards.length >= 1 &&
    selectedCards.length <= 5 &&
    store.state.handsLeft > 0;
  const canDiscard = canInteract && selectionCount > 0 && store.state.discardsLeft > 0;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const handlePlayClick = useCallback(() => {
    if (!canInteract) {
      showToast('商店阶段无法出牌：先点「离开商店」');
      return;
    }
    if (selectedCards.length < 1) {
      showToast('至少选中 1 张牌才能出牌');
      return;
    }
    if (store.state.handsLeft <= 0) {
      showToast('本轮出牌次数已用尽');
      return;
    }
    dispatch({ type: 'PlaySelected' });
  }, [canInteract, dispatch, selectedCards.length, showToast, store.state.handsLeft]);

  const handleDiscardClick = useCallback(() => {
    if (!canInteract) {
      showToast('商店阶段无法弃牌：先点「离开商店」');
      return;
    }
    if (selectionCount === 0) {
      showToast('至少选中 1 张牌才能弃牌');
      return;
    }
    if (store.state.discardsLeft <= 0) {
      showToast('本轮弃牌次数已用尽');
      return;
    }
    dispatch({ type: 'DiscardSelected' });
  }, [canInteract, dispatch, selectionCount, showToast, store.state.discardsLeft]);

  // Used from UI via "清空选中" in hand buttons long-press later; keep for now.
  // (Currently not wired to a button, but useful for debugging.)
  void clearSelect;

  return (
    <div className="app">
      <header className="topbar">
        <div className="titleBlock">
          <h1 className="h1">小丑牌（原型）</h1>
          <div className="sub">手机端手感优先：扇形手牌 + 点选/拖拽骨架</div>
        </div>
        <div className="pillRow">
          <button type="button" className="pill" onClick={() => setSettingsOpen(true)}>
            设置
          </button>
          <div className="pill">
            阶段 <strong>{store.state.phase === 'Blind' ? '盲注' : '商店'}</strong>
          </div>
          <div className="pill">
            选中 <strong>{selectionCount}</strong>
          </div>
          <div className="pill">
            盲注 <strong>{store.state.blind.kind}</strong>
          </div>
          <div className="pill">
            总分 <strong>{store.state.runScoreTotal}</strong>
          </div>
        </div>
      </header>

      {toast ? (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 18,
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.72)',
            border: '1px solid rgba(255,255,255,0.14)',
            color: 'rgba(255,255,255,0.92)',
            padding: '10px 12px',
            borderRadius: 12,
            fontSize: 13,
            zIndex: 999,
            maxWidth: '92vw',
          }}
          role="status"
        >
          {toast}
        </div>
      ) : null}

      <main className="board">
        {store.state.phase === 'Shop' ? (
          <section className="panel">
            <ShopView
              store={store}
              onBuyJoker={(jokerId) => dispatch({ type: 'ShopBuyJoker', jokerId: jokerId as any })}
              onReroll={() => dispatch({ type: 'ShopReroll' })}
              onLeave={() => dispatch({ type: 'ShopLeave' })}
            />
          </section>
        ) : null}

        <section className="panel">
          <div className="zoneTitle">
            <h2>计分区</h2>
            <div className="hint">
              本轮 {store.state.blind.scoreSoFar} / {store.state.blind.targetScore} · 总分 {store.state.runScoreTotal}
            </div>
          </div>
          {breakdown ? (
            <div className="hint" style={{ marginTop: 6 }}>
              基础：{breakdown.base.handType} · {breakdown.base.chipsFinal} × {breakdown.base.multFinal}
              {'  '}
              结算：{breakdown.final.chipsFinal} × {breakdown.final.multFinal} = {breakdown.final.score}
            </div>
          ) : (
            <div className="hint" style={{ marginTop: 6 }}>
              选中 1–5 张牌后，会显示基础 Chips/Mult 与结算结果
            </div>
          )}
          <JokerRow jokers={jokers} logs={breakdown?.logs ?? []} maxSlots={5} compact />
          {store.state.lastScoreText ? (
            <div className="hint" style={{ marginTop: 6 }}>
              本次：{store.state.lastScoreText}
              {store.state.phase === 'Shop' ? '（已达标，进入商店）' : null}
            </div>
          ) : null}
          <div className="hint" style={{ marginTop: 6 }}>
            本轮：出牌 {store.state.handsLeft} · 弃牌 {store.state.discardsLeft} · 金币 {store.state.money} · 选中 {selectedCards.length}/5
          </div>
        </section>

        <section className="panel handArea" aria-label="手牌区域">
          <div className="zoneTitle" style={{ marginBottom: 0 }}>
            <h2>手牌</h2>
            <div className="hint">
              点击选中；点「出牌 / 弃牌」即可
            </div>
          </div>

          <div className="handFan" onPointerMove={onCardPointerMove} onPointerUp={onCardPointerUp}>
            {displayHand.map((c, i) => {
              const ang = fanLayout.angles[i];
              const x = (i - (displayHand.length - 1) / 2) * fanLayout.spread;
              const lift = fanLayout.lifts[i];
              const sel = selected.has(c.id);
              const k = `${dealTick}-${c.id}`;
              return (
                <div
                  key={k}
                  className={`cardWrap ${sel ? 'cardWrapSelected' : ''} dealAnim`}
                  style={{
                    transform: `translateX(${x}px) translateY(${lift}px) rotate(${ang}deg)`,
                    animationDelay: `${i * 35}ms`,
                  }}
                  onPointerDown={canInteract ? (e) => onCardPointerDown(e, c.id) : undefined}
                  role="button"
                  aria-pressed={sel}
                  aria-label={`手牌 ${c.rank}${suitSymbol(c.suit)}`}
                >
                  <div className="card">
                    <div className="cardCorner">
                      <span className="rank">{c.rank}</span>
                      <span className="suit" style={{ color: isRed(c.suit) ? '#c62828' : '#111' }}>
                        {suitSymbol(c.suit)}
                      </span>
                    </div>
                    <div className="centerPip" style={{ color: isRed(c.suit) ? '#c62828' : '#111' }}>
                      {suitSymbol(c.suit)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="handButtons" aria-label="出牌与弃牌">
            <button
              className="btn btnPrimary"
              type="button"
              onClick={handlePlayClick}
              aria-disabled={!canPlay}
            >
              出牌
            </button>
            <button
              className="btn btnDanger"
              type="button"
              onClick={handleDiscardClick}
              aria-disabled={!canDiscard}
            >
              弃牌
            </button>
          </div>
        </section>
      </main>
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        store={store}
        onRestart={() => {
          const seed = (Date.now() >>> 0) ^ (store.state.seed * 2654435761);
          setStore(newRun(seed));
          setDealTick((t) => t + 1);
          setSettingsOpen(false);
        }}
        settings={settings}
        onChangeSettings={setSettings}
        onLoadSeed={(seed) => {
          setStore(newRun(seed));
          setDealTick((t) => t + 1);
          setSettingsOpen(false);
        }}
      />
    </div>
  );
}
