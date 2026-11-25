// The screenshot scenes behind ?shot=title|rush|serve|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a driver
// that walks the chef to a station and uses it, so the frame is what real play looks
// like and the same seed always gives the same frame.

import { STEP, PANTRY_ORDER, INGREDIENTS, DISHES, CHEF, STATIONS } from './config.js';
import { stationAnchor } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const SAMPLE = STEP;
/** Seconds a single plan step may take before it is skipped. */
const STEP_TIMEOUT = 25;

/** Distance from the chef to a station rect, copied small here for the driver. */
function distToStation(chef, stationRect) {
  const dx = Math.max(stationRect.x - chef.x, 0, chef.x - (stationRect.x + stationRect.w));
  const dy = Math.max(stationRect.y - chef.y, 0, chef.y - (stationRect.y + stationRect.h));
  return Math.hypot(dx, dy);
}

/**
 * Drive the world through a plan. A plan step is {station, pick, until} (walk to the
 * station, use it once in reach, move on when `until` holds) or {wait} (stand still
 * until `until` holds). Returns the steps actually run.
 */
function drivePlan(world, plan) {
  let stepIndex = 0;
  let acted = false;
  let spent = 0;
  let total = 0;
  const cap = 60 * 60 * 4;
  while (stepIndex < plan.length && total < cap) {
    const step = plan[stepIndex];
    const state = world.state;
    if (step.wait) {
      if (step.wait(state)) {
        stepIndex += 1;
        spent = 0;
      } else {
        world.step(SAMPLE, { mx: 0, my: 0, interact: false, pantryPick: -1, click: null });
        spent += SAMPLE;
        if (spent > STEP_TIMEOUT) {
          stepIndex += 1;
          spent = 0;
        }
      }
      total += 1;
      continue;
    }
    if (step.until(state)) {
      stepIndex += 1;
      acted = false;
      spent = 0;
      total += 1;
      continue;
    }
    const stationRect = worldStationRect(step.station);
    const chef = state.chef;
    const d = distToStation(chef, stationRect);
    let input = { mx: 0, my: 0, interact: false, pantryPick: -1, click: null };
    if (d < CHEF.interactRange) {
      if (!acted) {
        input = { mx: 0, my: 0, interact: true, pantryPick: step.pick ?? -1, click: null, station: step.station };
        acted = true;
      }
    } else {
      const anchor = stationAnchor(step.station);
      const dx = anchor.x - chef.x;
      const dy = anchor.y - chef.y;
      const len = Math.hypot(dx, dy) || 1;
      input = { mx: dx / len, my: dy / len, interact: false, pantryPick: -1, click: null };
    }
    world.step(SAMPLE, input);
    spent += SAMPLE;
    total += 1;
    if (spent > STEP_TIMEOUT) {
      stepIndex += 1;
      acted = false;
      spent = 0;
    }
  }
  return total;
}

function worldStationRect(key) {
  return STATIONS[key];
}

/** The raw pantry item that chops into `chopped`. */
function rawFor(chopped) {
  return Object.keys(INGREDIENTS).find((id) => INGREDIENTS[id].chopsTo === chopped);
}

/** A plan that cooks the first order's dish, plates it with its topping, then starts a second dish. */
function rushPlan(world) {
  const order = world.state.orders[0];
  const dish = DISHES.find((d) => d.id === order.dishId);
  const raw = rawFor(dish.chopped);
  const other = DISHES.find((d) => d.id !== dish.id);
  const otherRaw = rawFor(other.chopped);
  const pick = (id) => PANTRY_ORDER.indexOf(id);
  return [
    { station: 'pantry', pick: pick(dish.base), until: (s) => s.tray.includes(dish.base) },
    { station: 'pantry', pick: pick(raw), until: (s) => s.tray.includes(raw) },
    { station: 'board', until: (s) => !s.board.item && s.tray.includes(dish.chopped) },
    // The topping may be a chopped item: then fetch its raw form and chop it too.
    ...(INGREDIENTS[dish.topping].kind === 'chopped'
      ? [
        { station: 'pantry', pick: pick(rawFor(dish.topping)), until: (s) => s.tray.includes(rawFor(dish.topping)) },
        { station: 'board', until: (s) => !s.board.item && s.tray.includes(dish.topping) },
      ]
      : [
        { station: 'pantry', pick: pick(dish.topping), until: (s) => s.tray.includes(dish.topping) },
      ]),
    { station: 'wokA', until: (s) => s.woks[0].job && s.woks[0].job.state === 'cooking' },
    { wait: (s) => s.woks[0].job && s.woks[0].job.state === 'ready' },
    { station: 'wokA', until: (s) => s.tray.some((id) => id.startsWith('cooked:')) },
    { station: 'plate', until: (s) => s.plate.some((id) => id.startsWith('cooked:')) },
    { station: 'plate', until: (s) => s.plate.includes(dish.topping) },
    { station: 'pantry', pick: pick(other.base), until: (s) => s.tray.includes(other.base) },
    { station: 'pantry', pick: pick(otherRaw), until: (s) => s.tray.includes(otherRaw) },
    { station: 'board', until: (s) => !s.board.item && s.tray.includes(other.chopped) },
    { station: 'wokB', until: (s) => s.woks[1].job && s.woks[1].job.state === 'cooking' },
    { wait: (s) => s.woks[1].job && s.woks[1].job.progress > 0.45 },
    // One more ingredient on the tray, so the frame shows the next job starting.
    { station: 'pantry', pick: pick('telur'), until: (s) => s.tray.includes('telur') },
  ];
}

/** The next move for the greedy day player: always work on the first open order. */
function greedyGoal(state, world) {
  if (state.over) return null;
  if (world.platedDish()) return { station: 'window' };
  const readyIndex = state.woks.findIndex((w) => w.job && w.job.state === 'ready');
  if (readyIndex !== -1 && state.tray.length < CHEF.trayMax) {
    return { station: readyIndex === 0 ? 'wokA' : 'wokB' };
  }
  if (state.tray.some((id) => id.startsWith('cooked:')) && !state.plate.some((id) => id.startsWith('cooked:'))) {
    return { station: 'plate' };
  }
  const cookedId = state.plate.find((id) => id.startsWith('cooked:'));
  if (cookedId) {
    const dish = DISHES.find((d) => `cooked:${d.id}` === cookedId);
    if (dish && state.tray.includes(dish.topping)) return { station: 'plate' };
    if (dish) {
      // A chopped topping is fetched raw from the pantry and chopped first.
      if (INGREDIENTS[dish.topping].kind === 'chopped') {
        const raw = rawFor(dish.topping);
        if (state.tray.includes(raw)) return { station: 'board' };
        if (!state.board.item) return { station: 'pantry', pick: PANTRY_ORDER.indexOf(raw) };
        return null;
      }
      return { station: 'pantry', pick: PANTRY_ORDER.indexOf(dish.topping) };
    }
  }
  const freeWok = state.woks.findIndex((w) => !w.job);
  const hasBase = state.tray.some((id) => INGREDIENTS[id].kind === 'base');
  const hasChopped = state.tray.some((id) => INGREDIENTS[id].kind === 'chopped');
  if (freeWok !== -1 && hasBase && hasChopped) {
    return { station: freeWok === 0 ? 'wokA' : 'wokB' };
  }
  if (!state.board.item && state.tray.some((id) => INGREDIENTS[id].kind === 'raw')) {
    return { station: 'board' };
  }
  // A stale chopped item no open order wants gets tossed.
  const lastTray = state.tray[state.tray.length - 1];
  if (lastTray && INGREDIENTS[lastTray] && INGREDIENTS[lastTray].kind === 'chopped') {
    const wanted = state.orders.some((o) => {
      const d = DISHES.find((dd) => dd.id === o.dishId);
      return d && d.chopped === lastTray;
    });
    if (!wanted) return { station: 'trash' };
  }
  const order = state.orders[0];
  if (!order) return null;
  const dish = DISHES.find((d) => d.id === order.dishId);
  const raw = rawFor(dish.chopped);
  const baseBusy = state.woks.some((w) => w.job && w.job.base === dish.base && w.job.chopped === dish.chopped);
  if (!state.tray.includes(dish.base) && !baseBusy && !state.plate.some((id) => id === `cooked:${dish.id}`)) {
    return { station: 'pantry', pick: PANTRY_ORDER.indexOf(dish.base) };
  }
  if (!state.tray.includes(raw) && !state.tray.includes(dish.chopped) && !state.board.item) {
    return { station: 'pantry', pick: PANTRY_ORDER.indexOf(raw) };
  }
  return null;
}

/** Play a whole day with the greedy player, for the end scene. */
function playDay(world) {
  let acted = false;
  let current = null;
  for (let total = 0; total < 60 * 220; total += 1) {
    if (world.state.over) break;
    const goal = greedyGoal(world.state, world);
    const key = goal ? `${goal.station}:${goal.pick ?? -1}` : '';
    if (key !== current) {
      current = key;
      acted = false;
    }
    if (!goal) {
      world.step(SAMPLE, { mx: 0, my: 0, interact: false, pantryPick: -1, click: null });
      continue;
    }
    const chef = world.state.chef;
    const d = distToStation(chef, worldStationRect(goal.station));
    let input;
    if (d < CHEF.interactRange) {
      input = acted
        ? { mx: 0, my: 0, interact: false, pantryPick: -1, click: null }
        : { mx: 0, my: 0, interact: true, pantryPick: goal.pick ?? -1, click: null, station: goal.station };
      acted = true;
    } else {
      const anchor = stationAnchor(goal.station);
      const dx = anchor.x - chef.x;
      const dy = anchor.y - chef.y;
      const len = Math.hypot(dx, dy) || 1;
      input = { mx: dx / len, my: dy / len, interact: false, pantryPick: -1, click: null };
    }
    world.step(SAMPLE, input);
  }
}

/**
 * Set `world` to the named scene (title, rush, serve or end; any other name is title)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'serve') {
    const plan = rushPlan(world);
    drivePlan(world, plan);
    // Serve the finished plate at the window, then freeze on the coins.
    drivePlan(world, [{ station: 'window', until: (s) => s.plate.length === 0 && s.served >= 1 }]);
    return { screen: SCREEN_PLAY, best: world.state.coins };
  }
  if (name === 'rush') {
    drivePlan(world, rushPlan(world));
    return { screen: SCREEN_PLAY, best: world.state.coins };
  }
  if (name === 'end') {
    playDay(world);
    return { screen: SCREEN_OVER, best: world.state.coins };
  }
  for (let index = 0; index < 3 / STEP; index += 1) world.step(STEP, { mx: 0, my: 0, interact: false, pantryPick: -1, click: null });
  return { screen: SCREEN_TITLE, best: 0 };
}
