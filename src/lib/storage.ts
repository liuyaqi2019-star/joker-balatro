export type Settings = {
  sound: boolean;
  animation: 'full' | 'reduced';
  sortMode: 'rank' | 'suit';
};

export type SaveSlot = {
  id: string;
  name: string;
  savedAt: number;
  seed: number;
  // For MVP: only store seed + simple stats; later store full engine state.
  money: number;
  blindKind: string;
  blindTarget: number;
  blindScore: number;
};

const SETTINGS_KEY = 'joker_balatro_settings';
const SAVES_KEY = 'joker_balatro_saves_v1';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { sound: true, animation: 'full', sortMode: 'rank' };
    const p = JSON.parse(raw) as Partial<Settings>;
    return {
      sound: typeof p.sound === 'boolean' ? p.sound : true,
      animation: p.animation === 'reduced' ? 'reduced' : 'full',
      sortMode: p.sortMode === 'suit' ? 'suit' : 'rank',
    };
  } catch {
    return { sound: true, animation: 'full', sortMode: 'rank' };
  }
}

export function saveSettings(s: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function loadSaves(): SaveSlot[] {
  try {
    const raw = localStorage.getItem(SAVES_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return p.filter(Boolean) as SaveSlot[];
  } catch {
    return [];
  }
}

export function saveSaves(saves: SaveSlot[]): void {
  localStorage.setItem(SAVES_KEY, JSON.stringify(saves));
}

