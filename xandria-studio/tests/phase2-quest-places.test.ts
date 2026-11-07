/**
 * PHASE2: quest persistence (item 7) + named places (item 3).
 * - migrateProfile round-trips a valid quest snapshot, drops malformed
 *   entries, and yields undefined for a bad version / non-object.
 * - SaveExport strict import accepts a backup carrying questState and
 *   rejects a malformed one (shape only; unknown quest ids stay legal —
 *   the manager drops them on restore).
 * - The Forager quest names the Amberwood wilds in brief + objective.
 * - The camp panel title is Hollow Camp.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  _setProfileStorage,
  loadSlots,
  migrateProfile,
  saveSlots,
  type SaveSlot,
} from '../src/engine/game/Profile';
import { parseSaveExport, serializeSlot } from '../src/engine/game/SaveExport';
import { buildQuestPool } from '../src/engine/game/quests';
import { defaultSpec, type GameSpec } from '../src/spec/schema';
import { CampPanel } from '../src/engine/ui/CampPanel';

function memStore() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); },
  };
}

let mem: ReturnType<typeof memStore>;
beforeEach(() => {
  mem = memStore();
  _setProfileStorage(mem);
});

const SNAP = {
  version: 1,
  states: {
    quest_story_1_the_forager: { status: 'active', progress: [2], elapsed: 0 },
    quest_story_2_big_game: { status: 'turned-in', progress: [6] },
  },
  visited: { maps: ['0,0'], biomes: ['forest'] },
};

describe('phase2 quest persistence', () => {
  it('migrateProfile keeps a valid quest snapshot', () => {
    const p = migrateProfile({ version: 1, questState: SNAP });
    expect(p.questState).toEqual(SNAP);
  });

  it('migrateProfile drops malformed entries but keeps valid ones', () => {
    const p = migrateProfile({
      version: 1,
      questState: {
        version: 1,
        states: {
          good: { status: 'active', progress: [1] },
          badStatus: { status: 'nope', progress: [1] },
          badProgress: { status: 'active', progress: 'x' },
        },
      },
    });
    expect(Object.keys(p.questState!.states)).toEqual(['good']);
  });

  it('migrateProfile yields undefined for a bad version or non-object', () => {
    expect(migrateProfile({ version: 1, questState: { version: 2, states: {} } }).questState).toBeUndefined();
    expect(migrateProfile({ version: 1, questState: 'junk' }).questState).toBeUndefined();
    expect(migrateProfile({ version: 1 }).questState).toBeUndefined();
  });

  it('saveProfile/loadProfile round-trips questState through the store', () => {
    const st = loadSlots();
    const slot = st.slots.find((s) => s.id === st.activeSlotId)!;
    slot.profile.questState = SNAP as any;
    saveSlots(st);
    expect(loadSlots().slots.find((s) => s.id === st.activeSlotId)!.profile.questState).toEqual(SNAP);
  });

  it('SaveExport accepts a backup carrying questState', () => {
    const st = loadSlots();
    const slot: SaveSlot = st.slots.find((s) => s.id === st.activeSlotId)!;
    slot.profile.questState = SNAP as any;
    saveSlots(st);
    const doc = JSON.parse(serializeSlot(slot));
    doc.slot.profile.questState = SNAP;
    const r = parseSaveExport(JSON.stringify(doc));
    expect(r.ok).toBe(true);
  });

  it('SaveExport rejects a malformed questState', () => {
    const st = loadSlots();
    const slot: SaveSlot = st.slots.find((s) => s.id === st.activeSlotId)!;
    const doc = JSON.parse(serializeSlot(slot));
    doc.slot.profile.questState = { version: 1, states: { q: { status: 'nope', progress: [0] } } };
    const r = parseSaveExport(JSON.stringify(doc));
    expect(r.ok).toBe(false);
  });
});

describe('phase2 named places', () => {
  it('the Forager brief + objective name the Amberwood wilds', () => {
    // the pool picks a seeded 3-5 subset, so sweep fixed seeds
    const found: any[] = [];
    for (let seed = 1; seed <= 40 && found.length === 0; seed++) {
      const pool = buildQuestPool(defaultSpec(seed) as GameSpec);
      for (const d of pool) if (d.name === 'The Forager') found.push(d);
    }
    expect(found.length).toBeGreaterThan(0);
    for (const d of found) {
      expect(d.brief).toContain('Amberwood wilds');
      expect(d.objectives[0].desc).toContain('Amberwood wilds');
    }
  });

  it('the camp panel title is Hollow Camp', () => {
    const mkEl = (tag = 'div'): any => {
      const el: any = {
        tag, children: [] as any[], style: {} as any, textContent: '',
        appendChild(c: any) { el.children.push(c); return c; },
        append(...cs: any[]) { for (const c of cs) el.appendChild(c); },
        setAttribute() {}, addEventListener() {}, remove() {},
      };
      return el;
    };
    const doc: any = {
      createElement: (t: string) => mkEl(t),
      addEventListener() {}, removeEventListener() {},
      defaultView: { addEventListener() {}, removeEventListener() {} },
    };
    const container: any = { appendChild() {} };
    const panel = new CampPanel(container, {} as any, doc);
    const root: any = (panel as any).root;
    const titles = root.children.map((c: any) => c.textContent);
    expect(titles).toContain('Hollow Camp');
    panel.dispose();
  });
});
