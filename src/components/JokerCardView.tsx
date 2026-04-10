import './JokerCardView.css';
import type { JokerDef, JokerId } from '../engine/jokers';

type Props = {
  def: JokerDef;
  price?: number;
  disabled?: boolean;
  onClick?: () => void;
};

function styleForJoker(id: JokerId): { pattern: string; accent: string; badge: string } {
  switch (id) {
    case 'JokerPlusMult':
      return { pattern: 'patternSmile', accent: '#ffd166', badge: '+M' };
    case 'JokerPlusChips':
      return { pattern: 'patternChip', accent: '#4dd0e1', badge: '+C' };
    case 'JokerPairLover':
      return { pattern: 'patternPair', accent: '#f48fb1', badge: '2×' };
    case 'JokerSuitRed':
      return { pattern: 'patternHeart', accent: '#ff6b6b', badge: '♥♦' };
    case 'JokerLuckySeven':
      return { pattern: 'patternSeven', accent: '#c084fc', badge: '7' };
  }
}

export function JokerCardView({ def, price, disabled = false, onClick }: Props) {
  const st = styleForJoker(def.id);
  const CardTag = onClick ? 'button' : 'div';
  return (
    <CardTag
      className={`jokerCardView ${st.pattern} ${disabled ? 'jokerCardView--disabled' : ''}`}
      style={{ ['--joker-accent' as any]: st.accent }}
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      disabled={onClick ? disabled : undefined}
      aria-label={`小丑牌 ${def.name}：${def.desc}${price !== undefined ? `，价格 ${price}` : ''}`}
      title={def.desc}
    >
      <div className="jokerTop">
        <div className="jokerBadge" aria-hidden>
          {st.badge}
        </div>
        {price !== undefined ? (
          <div className="jokerPrice">
            ¥ <strong>{price}</strong>
          </div>
        ) : null}
      </div>
      <div className="jokerBody">
        <div className="jokerTitle">{def.name}</div>
        <div className="jokerDesc">{def.desc}</div>
      </div>
    </CardTag>
  );
}

