import { useEffect, useMemo, useState } from 'react';
import './SettingsSheet.css';
import type { SaveSlot, Settings } from '../lib/storage';
import { loadSaves, saveSaves, saveSettings } from '../lib/storage';
import type { GameStore } from '../engine/reducer';

type Props = {
  open: boolean;
  onClose: () => void;
  store: GameStore;
  onLoadSeed: (seed: number) => void;
  onRestart: () => void;
  settings: Settings;
  onChangeSettings: (next: Settings) => void;
};

function fmtTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function SettingsSheet({
  open,
  onClose,
  store,
  onLoadSeed,
  onRestart,
  settings,
  onChangeSettings,
}: Props) {
  const [saves, setSaves] = useState<SaveSlot[]>(() => loadSaves());
  const [slotName, setSlotName] = useState('存档 1');

  useEffect(() => {
    if (!open) return;
    setSaves(loadSaves());
  }, [open]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const canSave = useMemo(() => true, []);

  if (!open) return null;

  const doSave = () => {
    if (!canSave) return;
    const slot: SaveSlot = {
      id: crypto.randomUUID(),
      name: slotName.trim() || '未命名',
      savedAt: Date.now(),
      seed: store.state.seed,
      money: store.state.money,
      blindKind: store.state.blind.kind,
      blindTarget: store.state.blind.targetScore,
      blindScore: store.state.blind.scoreSoFar,
    };
    const next = [slot, ...saves].slice(0, 6);
    setSaves(next);
    saveSaves(next);
  };

  const doDelete = (id: string) => {
    const next = saves.filter((s) => s.id !== id);
    setSaves(next);
    saveSaves(next);
  };

  return (
    <div className="sheetOverlay" role="dialog" aria-modal="true" aria-label="设置与存档">
      <div className="sheet">
        <div className="sheetHeader">
          <div>
            <div className="sheetTitle">设置</div>
            <div className="sheetSub">音效/动画/存档槽（MVP）</div>
          </div>
          <button type="button" className="sheetClose" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="sheetSection">
          <div className="sheetRow">
            <span>音效</span>
            <button
              type="button"
              className={`chip ${settings.sound ? 'chipActive' : ''}`}
              onClick={() => onChangeSettings({ ...settings, sound: !settings.sound })}
            >
              {settings.sound ? '开' : '关'}
            </button>
          </div>
          <div className="sheetRow">
            <span>动画</span>
            <div className="chipGroup">
              <button
                type="button"
                className={`chip ${settings.animation === 'full' ? 'chipActive' : ''}`}
                onClick={() => onChangeSettings({ ...settings, animation: 'full' })}
              >
                完整
              </button>
              <button
                type="button"
                className={`chip ${settings.animation === 'reduced' ? 'chipActive' : ''}`}
                onClick={() => onChangeSettings({ ...settings, animation: 'reduced' })}
              >
                简化
              </button>
            </div>
          </div>
          <div className="sheetRow">
            <span>手牌排序</span>
            <div className="chipGroup">
              <button
                type="button"
                className={`chip ${settings.sortMode === 'rank' ? 'chipActive' : ''}`}
                onClick={() => onChangeSettings({ ...settings, sortMode: 'rank' })}
              >
                按大小
              </button>
              <button
                type="button"
                className={`chip ${settings.sortMode === 'suit' ? 'chipActive' : ''}`}
                onClick={() => onChangeSettings({ ...settings, sortMode: 'suit' })}
              >
                按花色
              </button>
            </div>
          </div>
          <div className="sheetRow">
            <span>重新开始</span>
            <button type="button" className="chip" onClick={onRestart}>
              重新开始游戏
            </button>
          </div>
        </div>

        <div className="sheetSection">
          <div className="sheetTitle2">存档槽</div>
          <div className="saveForm">
            <input
              className="saveInput"
              value={slotName}
              onChange={(e) => setSlotName(e.target.value)}
              placeholder="存档名称"
            />
            <button type="button" className="btn btnPrimary" onClick={doSave}>
              保存当前（seed）
            </button>
          </div>

          <div className="saveList">
            {saves.map((s) => (
              <div key={s.id} className="saveItem">
                <div className="saveMeta">
                  <div className="saveName">{s.name}</div>
                  <div className="saveDesc">
                    {fmtTime(s.savedAt)} · seed {s.seed} · {s.blindKind} {s.blindScore}/{s.blindTarget} · ¥{s.money}
                  </div>
                </div>
                <div className="saveActions">
                  <button type="button" className="chip" onClick={() => onLoadSeed(s.seed)}>
                    载入
                  </button>
                  <button type="button" className="chip" onClick={() => doDelete(s.id)}>
                    删除
                  </button>
                </div>
              </div>
            ))}
            {saves.length === 0 ? <div className="saveEmpty">（暂无存档）</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

