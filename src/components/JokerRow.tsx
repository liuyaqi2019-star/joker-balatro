import './JokerRow.css';
import type { JokerDef, JokerInstance, ScoreLog } from '../engine/jokers';
import { getJokerDef } from '../engine/jokers';
import { JokerCardView } from './JokerCardView';

type Props = {
  jokers: JokerInstance[];
  logs: ScoreLog[];
  maxSlots?: number;
  compact?: boolean;
};

export function JokerRow({ jokers, logs, maxSlots = 5, compact = false }: Props) {
  const defs: JokerDef[] = jokers.map((j) => getJokerDef(j.id));
  const emptySlots = Math.max(0, maxSlots - defs.length);
  return (
    <div className={`jokerRow ${compact ? 'jokerRow--compact' : ''}`} aria-label="小丑牌区域">
      <div className="jokerStrip" role="list">
        {defs.map((d) => (
          <div key={d.id} className="jokerCardWrap" role="listitem">
            <JokerCardView def={d} />
          </div>
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={`empty-${i}`} className="jokerEmptySlot" aria-hidden />
        ))}
      </div>
      {logs.length ? (
        <div className="jokerLogs" aria-label="小丑触发日志">
          {logs.slice(0, 3).map((l, idx) => (
            <div key={`${l.jokerId}-${idx}`} className="jokerLog">
              <span className="jokerLogTitle">{l.title}</span>
              <span className="jokerLogDetail">{l.detail}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

