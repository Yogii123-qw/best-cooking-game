// Dapur Membara: every tuning number, colour, recipe and station in one place.
// The kitchen is a fixed 1280x720 logical area; the renderer scales it to the window,
// so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** One full service day, in seconds. */
export const DAY_SECONDS = 180;

/** The chef's movement and carrying limits. */
export const CHEF = {
  radius: 22,
  speed: 270,
  trayMax: 4,
  interactRange: 78,
};

/** Ingredient ids. Raw ones chop; bases cook; toppings finish a dish. */
export const INGREDIENTS = {
  nasi: { name: 'Nasi', kind: 'base', color: '#f5efe0', accent: '#d9c9a3' },
  mie: { name: 'Mie', kind: 'base', color: '#f2c14e', accent: '#c98f1b' },
  ayam: { name: 'Ayam', kind: 'raw', chopsTo: 'ayamCincang', color: '#f0a35e', accent: '#c96a1e' },
  sayur: { name: 'Sayur', kind: 'raw', chopsTo: 'sayurCincang', color: '#7bc96f', accent: '#3e8e41' },
  cabai: { name: 'Cabai', kind: 'raw', chopsTo: 'cabaiCincang', color: '#e5484d', accent: '#a11d21' },
  telur: { name: 'Telur', kind: 'topping', color: '#fdf3d0', accent: '#e8a838' },
  ayamCincang: { name: 'Ayam Cincang', kind: 'chopped', color: '#f0a35e', accent: '#c96a1e' },
  sayurCincang: { name: 'Sayur Cincang', kind: 'chopped', color: '#7bc96f', accent: '#3e8e41' },
  cabaiCincang: { name: 'Cabai Cincang', kind: 'chopped', color: '#e5484d', accent: '#a11d21' },
};

/** The pantry order: the keys 1-6 take these, in this order. */
export const PANTRY_ORDER = ['nasi', 'mie', 'ayam', 'sayur', 'cabai', 'telur'];

/**
 * Dishes. A dish is a wok job (one base plus one chopped item, cooked) plus one
 * topping placed on the plate. The topping may be a fresh pantry item or a chopped one.
 */
export const DISHES = [
  { id: 'nasiGoreng', name: 'Nasi Goreng', base: 'nasi', chopped: 'ayamCincang', topping: 'telur', price: 30 },
  { id: 'mieGoreng', name: 'Mie Goreng', base: 'mie', chopped: 'sayurCincang', topping: 'cabaiCincang', price: 30 },
  { id: 'ayamGeprek', name: 'Ayam Geprek', base: 'nasi', chopped: 'ayamCincang', topping: 'cabaiCincang', price: 34 },
  { id: 'capcay', name: 'Capcay', base: 'mie', chopped: 'sayurCincang', topping: 'telur', price: 28 },
  { id: 'nasiCabai', name: 'Nasi Cabai', base: 'nasi', chopped: 'cabaiCincang', topping: 'telur', price: 26 },
  { id: 'mieAyam', name: 'Mie Ayam', base: 'mie', chopped: 'ayamCincang', topping: 'sayurCincang', price: 32 },
];

/** What a wok job becomes once it is cooked. */
export function wokResultName(base, chopped) {
  const dish = DISHES.find((d) => d.base === base && d.chopped === chopped);
  return dish ? dish.name : 'Tumisan';
}

/** Station rectangles, in kitchen coordinates. */
export const STATIONS = {
  pantry: { x: 24, y: 150, w: 168, h: 150, label: 'Pantry' },
  board: { x: 24, y: 360, w: 168, h: 130, label: 'Talenan' },
  wokA: { x: 1000, y: 150, w: 120, h: 110, label: 'Wok 1' },
  wokB: { x: 1130, y: 150, w: 120, h: 110, label: 'Wok 2' },
  plate: { x: 500, y: 560, w: 280, h: 120, label: 'Meja Plating' },
  window: { x: 1100, y: 360, w: 150, h: 130, label: 'Jendela Saji' },
  trash: { x: 24, y: 560, w: 130, h: 120, label: 'Tong Sampah' },
};

/** Where the chef starts each day, and the walkable floor bounds. */
export const SPAWN = { x: 640, y: 430 };
export const FLOOR = { x: 200, y: 130, w: 880, h: 480 };

/** Chopping and cooking times, in seconds. */
export const CHOP_SECONDS = 1.4;
export const COOK_SECONDS = 4.0;
export const READY_SECONDS = 4.5;

/** Orders: how long a ticket lives, and how fast new ones arrive. */
export const ORDER = {
  maxOpen: 3,
  lifeStart: 48,
  lifeEnd: 30,
  intervalStart: 14,
  intervalEnd: 7,
  rushAt: 60,
};

/** Scoring. */
export const SCORE = {
  wrongServe: -10,
  burntTrash: 0,
  comboWindow: 20,
  comboMax: 3,
};

/** Combo multiplier steps: 1x, then 1.5x, 2x, 3x. */
export function comboMultiplier(combo) {
  if (combo <= 1) return 1;
  if (combo === 2) return 1.5;
  if (combo === 3) return 2;
  return 3;
}

export const PALETTE = {
  floor: '#3a2c22',
  floorLine: '#4a382c',
  wall: '#f3e2c7',
  wallTrim: '#c96a1e',
  counter: '#8a5a33',
  counterTop: '#a9713f',
  steel: '#c9ced6',
  steelDark: '#9aa1ad',
  board: '#e8d3a7',
  wok: '#2b2f36',
  flame: '#ff9f1c',
  flameHot: '#ff5714',
  plate: '#fdfaf3',
  ticket: '#fff8e1',
  ticketUrgent: '#ffe0d6',
  text: '#241a12',
  textLight: '#fdf6e3',
  muted: '#8b7d6b',
  accent: '#e5484d',
  green: '#3e8e41',
  gold: '#f2c14e',
  panel: '#2b2118',
  panelEdge: '#574433',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best result is kept between visits (this browser only). */
export const BEST_KEY = 'dapur-membara.best';
