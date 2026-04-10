import './ShopView.css';
import type { GameStore } from '../engine/reducer';
import { getJokerDef } from '../engine/jokers';
import { JokerCardView } from './JokerCardView';

type Props = {
  store: GameStore;
  onBuyJoker: (jokerId: GameStore['state']['jokers'][number]['id']) => void;
  onReroll: () => void;
  onLeave: () => void;
};

export function ShopView({ store, onBuyJoker, onReroll, onLeave }: Props) {
  return (
    <div className="shop">
      <div className="shopHeader">
        <div>
          <div className="shopTitle">商店</div>
          <div className="shopSub">买小丑 / 刷新 / 离开</div>
        </div>
        <div className="shopMoney">
          金币 <strong>{store.state.money}</strong>
        </div>
      </div>
      <div className="shopItems">
        {store.shop.items.map((it, idx) => {
          if (it.type !== 'Joker') return null;
          const def = getJokerDef(it.jokerId);
          const affordable = store.state.money >= it.price;
          return (
            <div
              key={`${it.jokerId}-${idx}`}
              className="shopItemWrap"
            >
              <JokerCardView
                def={def}
                price={it.price}
                disabled={!affordable}
                onClick={() => onBuyJoker(it.jokerId)}
              />
            </div>
          );
        })}
        {store.shop.items.length === 0 ? (
          <div className="shopEmpty">（已买空）</div>
        ) : null}
      </div>
      <div className="shopActions">
        <button type="button" className="btn" onClick={onReroll} disabled={store.state.money < 1}>
          刷新（-1）
        </button>
        <button type="button" className="btn btnPrimary" onClick={onLeave}>
          离开商店
        </button>
      </div>
    </div>
  );
}

