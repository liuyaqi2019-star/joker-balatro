import { useMemo, useState } from 'react';
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
  const [openId, setOpenId] = useState<string | null>(null);
  const openDef = useMemo(() => defs.find((d) => d.id === openId) ?? null, [defs, openId]);
  return (
    <div className={`jokerRow ${compact ? 'jokerRow--compact' : ''}`} aria-label="小丑牌区域">
      <div className="jokerStrip" role="list" aria-label="小丑牌（点击查看）">
        <div className="jokerStack" role="presentation">
          {defs.map((d, idx) => (
            <button
              key={d.id}
              type="button"
              className="jokerStackCard"
              style={{ ['--joker-i' as any]: idx }}
              onClick={() => setOpenId(d.id)}
              aria-label={`查看小丑牌：${d.name}`}
            >
              <span className="jokerStackBadge" aria-hidden>
                {idx + 1}
              </span>
              <span className="jokerStackTitle">{d.name}</span>
            </button>
          ))}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <div key={`empty-${i}`} className="jokerEmptySlot" aria-hidden />
          ))}
        </div>
      </div>

      {openDef ? (
        <div className="jokerModalOverlay" role="dialog" aria-modal="true" aria-label="小丑牌详情">
          <div className="jokerModal">
            <div className="jokerModalHeader">
              <div className="jokerModalTitle">小丑牌详情</div>
              <button type="button" className="jokerModalClose" onClick={() => setOpenId(null)}>
                关闭
              </button>
            </div>
            <div className="jokerModalBody">
              <JokerCardView def={openDef} />
              <div className="jokerModalDesc">
                <div className="jokerModalName">{openDef.name}</div>
                <div className="jokerModalText">{openDef.desc}</div>
              </div>
            </div>
          </div>
          <button type="button" className="jokerModalBackdrop" aria-label="关闭" onClick={() => setOpenId(null)} />
        </div>
      ) : null}
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

