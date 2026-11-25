// Keyboard and pointer input. Held keys give a movement vector; one-shot presses
// (interact, pause, pantry picks) are queued as events and taken once by the loop, so
// a press between two frames is never lost and never counted twice. A pointer click
// sets a walk target the chef steers toward, and a click on a station acts on it.

export const ACTION_INTERACT = 1;
export const ACTION_PAUSE = 2;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const INTERACT = new Set(['Space', 'KeyE', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const PANTRY_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'];

export function createInput(canvas, toKitchen) {
  const held = new Set();
  let actions = 0;
  let pantryPick = -1;
  let click = null;

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code)) {
      held.add(event.code);
      event.preventDefault();
      return;
    }
    if (INTERACT.has(event.code)) {
      if (!event.repeat) actions |= ACTION_INTERACT;
      event.preventDefault();
      return;
    }
    if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
      event.preventDefault();
      return;
    }
    const pick = PANTRY_KEYS.indexOf(event.code);
    if (pick !== -1) pantryPick = pick;
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => held.clear());

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const point = toKitchen(event.clientX - rect.left, event.clientY - rect.top);
    click = { x: point.x, y: point.y };
    actions |= ACTION_INTERACT;
  });

  function has(codeSet) {
    for (const code of codeSet) if (held.has(code)) return true;
    return false;
  }

  return {
    /** Normalised movement vector from held keys, {x, y} each in -1..1. */
    move() {
      const x = (has(RIGHT) ? 1 : 0) - (has(LEFT) ? 1 : 0);
      const y = (has(DOWN) ? 1 : 0) - (has(UP) ? 1 : 0);
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    },
    /** One-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Pantry slot picked by number key since the last call, -1 when none. */
    takePantryPick() {
      const pick = pantryPick;
      pantryPick = -1;
      return pick;
    },
    /** Last pointer click in kitchen coordinates, taken once. */
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
  };
}
