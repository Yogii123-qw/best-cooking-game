// Dapur Membara: the whole simulation. A chef walks a small kitchen, takes ingredients
// from the pantry, chops them on the board, cooks a base plus a chopped item in a wok,
// assembles the dish on the plating counter and serves it at the window before the
// ticket on the order board runs out. Everything runs in fixed 1/60 s steps.

import {
  STEP, DAY_SECONDS, CHEF, INGREDIENTS, PANTRY_ORDER, DISHES, STATIONS, SPAWN, FLOOR,
  CHOP_SECONDS, COOK_SECONDS, READY_SECONDS, ORDER, SCORE, comboMultiplier, wokResultName,
} from './config.js';

export const EVENT_PICKUP = 1;
export const EVENT_CHOP_DONE = 2;
export const EVENT_WOK_READY = 4;
export const EVENT_SERVED = 8;
export const EVENT_ERROR = 16;
export const EVENT_EXPIRED = 32;
export const EVENT_BURNT = 64;
export const EVENT_RUSH = 128;
export const EVENT_OVER = 256;
export const EVENT_WARN = 512;

let nextOrderId = 1;

function stationCenter(key) {
  const s = STATIONS[key];
  return { x: s.x + s.w / 2, y: s.y + s.h / 2 };
}

/** The spot the chef walks to in front of a station. */
export function stationAnchor(key) {
  const s = STATIONS[key];
  if (key === 'pantry' || key === 'board' || key === 'trash') return { x: s.x + s.w + 34, y: s.y + s.h / 2 };
  if (key === 'window') return { x: s.x - 34, y: s.y + s.h / 2 };
  if (key === 'wokA' || key === 'wokB') return { x: s.x + s.w / 2, y: s.y + s.h + 34 };
  return { x: s.x + s.w / 2, y: s.y - 34 };
}

/** Distance from a point to a rectangle, 0 when inside. */
function distToRect(x, y, r) {
  const dx = Math.max(r.x - x, 0, x - (r.x + r.w));
  const dy = Math.max(r.y - y, 0, y - (r.y + r.h));
  return Math.hypot(dx, dy);
}

function clampToFloor(p) {
  return {
    x: Math.min(FLOOR.x + FLOOR.w, Math.max(FLOOR.x, p.x)),
    y: Math.min(FLOOR.y + FLOOR.h, Math.max(FLOOR.y, p.y)),
  };
}

function pushOutOfStations(chef) {
  for (const key of Object.keys(STATIONS)) {
    const s = STATIONS[key];
    const nearestX = Math.min(s.x + s.w, Math.max(s.x, chef.x));
    const nearestY = Math.min(s.y + s.h, Math.max(s.y, chef.y));
    const dx = chef.x - nearestX;
    const dy = chef.y - nearestY;
    const d = Math.hypot(dx, dy);
    if (d < CHEF.radius && d > 0.001) {
      chef.x = nearestX + (dx / d) * CHEF.radius;
      chef.y = nearestY + (dy / d) * CHEF.radius;
    } else if (d <= 0.001) {
      chef.y = s.y + s.h + CHEF.radius;
    }
  }
}

export function createWorld(random) {
  const state = freshState();

  function freshState() {
    return {
      chef: { x: SPAWN.x, y: SPAWN.y, tx: null, ty: null, face: 1 },
      tray: [],
      board: { item: null, progress: 0 },
      woks: [
        { job: null },
        { job: null },
      ],
      plate: [],
      orders: [],
      coins: 0,
      combo: 0,
      comboTimer: 0,
      served: 0,
      lost: 0,
      timeLeft: DAY_SECONDS,
      elapsed: 0,
      spawnIn: 6,
      rush: false,
      over: false,
      particles: [],
      floaters: [],
      shake: 0,
    };
  }

  function reset() {
    const kept = freshState();
    for (const key of Object.keys(state)) delete state[key];
    Object.assign(state, kept);
    nextOrderId = 1;
    spawnOrder();
    spawnOrder();
  }

  function dayProgress() {
    return 1 - state.timeLeft / DAY_SECONDS;
  }

  function orderLife() {
    return ORDER.lifeStart + (ORDER.lifeEnd - ORDER.lifeStart) * dayProgress();
  }

  function orderInterval() {
    const base = ORDER.intervalStart + (ORDER.intervalEnd - ORDER.intervalStart) * dayProgress();
    return state.rush ? base * 0.55 : base;
  }

  function spawnOrder() {
    if (state.orders.length >= ORDER.maxOpen) return;
    const dish = DISHES[Math.floor(random() * DISHES.length)];
    const life = orderLife();
    state.orders.push({
      id: nextOrderId,
      dishId: dish.id,
      name: dish.name,
      price: dish.price,
      timeLeft: life,
      life,
      warned: false,
    });
    nextOrderId += 1;
  }

  function addFloater(x, y, text, color) {
    state.floaters.push({ x, y, text, color, life: 1.4, maxLife: 1.4 });
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = random() * Math.PI * 2;
      const v = speed * (0.4 + random() * 0.8);
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v - 40,
        life: 0.5 + random() * 0.5,
        maxLife: 1,
        color,
        size: 3 + random() * 4,
      });
    }
  }

  function steam(x, y) {
    state.particles.push({
      x: x + (random() - 0.5) * 20, y,
      vx: (random() - 0.5) * 10, vy: -34 - random() * 20,
      life: 0.7 + random() * 0.4, maxLife: 1.1,
      color: 'rgba(240,240,235,0.55)', size: 5 + random() * 5,
    });
  }

  /** Which station the chef can reach right now, or null. */
  function nearestStation() {
    let best = null;
    let bestDist = CHEF.interactRange;
    for (const key of Object.keys(STATIONS)) {
      const d = distToRect(state.chef.x, state.chef.y, STATIONS[key]);
      if (d < bestDist) {
        bestDist = d;
        best = key;
      }
    }
    return best;
  }

  function pantrySlotAt(x, y) {
    const s = STATIONS.pantry;
    const col = Math.floor((x - s.x - 4) / 56);
    const row = Math.floor((y - s.y - 4) / 74);
    if (col < 0 || col > 2 || row < 0 || row > 1) return -1;
    return row * 3 + col;
  }

  function takeIngredient(id) {
    if (state.tray.length >= CHEF.trayMax) {
      addFloater(state.chef.x, state.chef.y - 40, 'Tray full!', '#e5484d');
      return EVENT_ERROR;
    }
    state.tray.push(id);
    burst(state.chef.x, state.chef.y - 10, INGREDIENTS[id].color, 6, 60);
    return EVENT_PICKUP;
  }

  function dishFor(base, chopped) {
    return DISHES.find((d) => d.base === base && d.chopped === chopped) ?? null;
  }

  function interact(station, pantryPick) {
    const chef = state.chef;
    const center = stationCenter(station);
    if (station === 'pantry') {
      const pick = pantryPick >= 0 && pantryPick < PANTRY_ORDER.length ? pantryPick : -1;
      if (pick === -1) {
        addFloater(center.x, center.y - 60, 'Pick 1-6 or click', '#fdf6e3');
        return 0;
      }
      return takeIngredient(PANTRY_ORDER[pick]);
    }
    if (station === 'board') {
      if (state.board.item) return 0;
      const rawIndex = state.tray.findIndex((id) => INGREDIENTS[id].kind === 'raw');
      if (rawIndex === -1) {
        addFloater(center.x, center.y - 40, 'Need something raw', '#fdf6e3');
        return 0;
      }
      state.board.item = state.tray.splice(rawIndex, 1)[0];
      state.board.progress = 0;
      return EVENT_PICKUP;
    }
    if (station === 'wokA' || station === 'wokB') {
      const wok = state.woks[station === 'wokA' ? 0 : 1];
      if (wok.job && wok.job.state === 'burnt') {
        wok.job = null;
        addFloater(center.x, center.y - 50, 'Burnt. Binned.', '#e5484d');
        return EVENT_ERROR;
      }
      if (wok.job && wok.job.state === 'ready') {
        if (state.tray.length >= CHEF.trayMax) {
          addFloater(chef.x, chef.y - 40, 'Tray full!', '#e5484d');
          return EVENT_ERROR;
        }
        const dish = dishFor(wok.job.base, wok.job.chopped);
        state.tray.push(dish ? `cooked:${dish.id}` : 'cooked:mix');
        wok.job = null;
        return EVENT_PICKUP;
      }
      if (wok.job) return 0;
      const baseIndex = state.tray.findIndex((id) => INGREDIENTS[id].kind === 'base');
      const choppedIndex = state.tray.findIndex((id) => INGREDIENTS[id].kind === 'chopped');
      if (baseIndex === -1 || choppedIndex === -1) {
        addFloater(center.x, center.y - 50, 'Needs base + chopped', '#fdf6e3');
        return 0;
      }
      const base = state.tray.splice(baseIndex, 1)[0];
      const chopped = state.tray.splice(state.tray.findIndex((id) => INGREDIENTS[id].kind === 'chopped'), 1)[0];
      wok.job = { base, chopped, progress: 0, state: 'cooking', readyIn: READY_SECONDS };
      return EVENT_PICKUP;
    }
    if (station === 'plate') {
      const cookedIndex = state.tray.findIndex((id) => id.startsWith('cooked:'));
      const hasCooked = state.plate.some((id) => id.startsWith('cooked:'));
      if (cookedIndex !== -1 && !hasCooked) {
        state.plate.push(state.tray.splice(cookedIndex, 1)[0]);
        return EVENT_PICKUP;
      }
      if (hasCooked) {
        const cookedId = state.plate.find((id) => id.startsWith('cooked:'));
        const dish = DISHES.find((d) => `cooked:${d.id}` === cookedId);
        if (dish) {
          const toppingIndex = state.tray.findIndex((id) => id === dish.topping);
          if (toppingIndex !== -1 && !state.plate.includes(dish.topping)) {
            state.plate.push(state.tray.splice(toppingIndex, 1)[0]);
            addFloater(center.x, center.y - 60, `${dish.name} ready!`, '#7bc96f');
            return EVENT_PICKUP;
          }
          if (state.plate.includes(dish.topping)) {
            addFloater(center.x, center.y - 60, 'Serve it at the window', '#fdf6e3');
            return 0;
          }
          addFloater(center.x, center.y - 60, `Needs ${INGREDIENTS[dish.topping].name}`, '#fdf6e3');
          return 0;
        }
        addFloater(center.x, center.y - 60, 'No order wants this mix', '#e5484d');
        return EVENT_ERROR;
      }
      addFloater(center.x, center.y - 60, 'Cook something first', '#fdf6e3');
      return 0;
    }
    if (station === 'window') {
      const cookedId = state.plate.find((id) => id.startsWith('cooked:'));
      if (!cookedId) {
        addFloater(center.x, center.y - 50, 'Plate is empty', '#fdf6e3');
        return 0;
      }
      const dish = DISHES.find((d) => `cooked:${d.id}` === cookedId);
      if (!dish || !state.plate.includes(dish.topping)) {
        addFloater(center.x, center.y - 50, 'Dish is not finished', '#e5484d');
        return EVENT_ERROR;
      }
      const orderIndex = state.orders.findIndex((o) => o.dishId === dish.id);
      state.plate = [];
      if (orderIndex === -1) {
        state.coins = Math.max(0, state.coins + SCORE.wrongServe);
        state.combo = 0;
        state.comboTimer = 0;
        state.shake = 0.35;
        addFloater(center.x, center.y - 50, 'Nobody ordered that -10', '#e5484d');
        return EVENT_ERROR;
      }
      const order = state.orders.splice(orderIndex, 1)[0];
      const mult = comboMultiplier(state.combo + 1);
      const earned = Math.round(order.price * mult);
      state.coins += earned;
      state.combo += 1;
      state.comboTimer = SCORE.comboWindow;
      state.served += 1;
      burst(center.x, center.y - 20, '#f2c14e', 16, 160);
      addFloater(center.x, center.y - 60, `+${earned} coins`, '#f2c14e');
      return EVENT_SERVED;
    }
    if (station === 'trash') {
      if (state.plate.length > 0) {
        state.plate = [];
        addFloater(center.x, center.y - 50, 'Plate cleared', '#fdf6e3');
        return EVENT_PICKUP;
      }
      if (state.tray.length > 0) {
        state.tray.pop();
        addFloater(center.x, center.y - 50, 'Tossed', '#fdf6e3');
        return EVENT_PICKUP;
      }
      return 0;
    }
    return 0;
  }

  function step(dt, input) {
    let events = 0;
    if (state.over) {
      updateAmbient(dt);
      return 0;
    }

    state.elapsed += dt;
    state.timeLeft -= dt;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      state.over = true;
      return EVENT_OVER;
    }
    if (!state.rush && state.timeLeft <= ORDER.rushAt) {
      state.rush = true;
      events |= EVENT_RUSH;
    }

    // Orders arrive and expire.
    state.spawnIn -= dt;
    if (state.spawnIn <= 0) {
      spawnOrder();
      state.spawnIn = orderInterval() * (0.85 + random() * 0.3);
    }
    for (let i = state.orders.length - 1; i >= 0; i -= 1) {
      const order = state.orders[i];
      order.timeLeft -= dt;
      if (!order.warned && order.timeLeft <= 10) {
        order.warned = true;
        events |= EVENT_WARN;
        addFloater(640, 150, `${order.name} almost gone!`, '#e5484d');
      }
      if (order.timeLeft <= 0) {
        state.orders.splice(i, 1);
        state.lost += 1;
        state.combo = 0;
        state.comboTimer = 0;
        events |= EVENT_EXPIRED;
      }
    }
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }

    // Movement: keys steer, a click sets a walk target, keys cancel it.
    const chef = state.chef;
    let mx = input.mx ?? 0;
    let my = input.my ?? 0;
    if (mx !== 0 || my !== 0) {
      chef.tx = null;
      chef.ty = null;
    } else if (chef.tx !== null && chef.ty !== null) {
      const dx = chef.tx - chef.x;
      const dy = chef.ty - chef.y;
      const d = Math.hypot(dx, dy);
      if (d < 8) {
        chef.tx = null;
        chef.ty = null;
      } else {
        mx = dx / d;
        my = dy / d;
      }
    }
    if (mx !== 0 || my !== 0) {
      chef.face = mx < 0 ? -1 : mx > 0 ? 1 : chef.face;
      chef.x += mx * CHEF.speed * dt;
      chef.y += my * CHEF.speed * dt;
      const clamped = clampToFloor(chef);
      chef.x = clamped.x;
      chef.y = clamped.y;
      pushOutOfStations(chef);
    }

    // Clicks: on a station, walk there and act on arrival; elsewhere, just walk.
    if (input.click) {
      const clicked = Object.keys(STATIONS).find((key) => {
        const s = STATIONS[key];
        return input.click.x >= s.x && input.click.x <= s.x + s.w
          && input.click.y >= s.y && input.click.y <= s.y + s.h;
      });
      if (clicked) {
        const anchor = clampToFloor(stationAnchor(clicked));
        chef.tx = anchor.x;
        chef.ty = anchor.y;
        chef.pendingStation = clicked;
        chef.pendingPick = clicked === 'pantry' ? pantrySlotAt(input.click.x, input.click.y) : -1;
      } else {
        const target = clampToFloor(input.click);
        chef.tx = target.x;
        chef.ty = target.y;
        chef.pendingStation = null;
      }
    }
    if (chef.pendingStation) {
      const d = distToRect(chef.x, chef.y, STATIONS[chef.pendingStation]);
      if (d < CHEF.interactRange) {
        events |= interact(chef.pendingStation, chef.pendingPick ?? -1);
        chef.pendingStation = null;
        chef.pendingPick = -1;
      }
    }

    // Interact key: act on the named station when one is given and in reach
    // (a driver steering at one station), else on the nearest station in reach.
    if (input.interact) {
      let station = null;
      if (input.station && STATIONS[input.station]
        && distToRect(state.chef.x, state.chef.y, STATIONS[input.station]) < CHEF.interactRange) {
        station = input.station;
      } else {
        station = nearestStation();
      }
      if (station) {
        const pick = station === 'pantry' ? (input.pantryPick ?? -1) : -1;
        events |= interact(station, pick);
      }
    }
    // Number keys at the pantry take an ingredient without the interact key.
    // When the interact key was pressed in the same step, the branch above already
    // used the pick: taking it twice would put two of one ingredient on the tray.
    if (input.pantryPick >= 0 && !input.interact && nearestStation() === 'pantry') {
      events |= interact('pantry', input.pantryPick);
    }

    // Chopping finishes on its own and returns the chopped item to the tray.
    if (state.board.item) {
      state.board.progress += dt / CHOP_SECONDS;
      if (state.board.progress >= 1) {
        const chopped = INGREDIENTS[state.board.item].chopsTo;
        state.board.item = null;
        state.board.progress = 0;
        if (state.tray.length < CHEF.trayMax) {
          state.tray.push(chopped);
          events |= EVENT_CHOP_DONE;
        } else {
          addFloater(chef.x, chef.y - 40, 'Tray full!', '#e5484d');
          events |= EVENT_ERROR;
        }
      }
    }

    // Woks cook, then wait to be collected, then burn.
    state.woks.forEach((wok, index) => {
      const job = wok.job;
      if (!job) return;
      const center = stationCenter(index === 0 ? 'wokA' : 'wokB');
      if (job.state === 'cooking') {
        job.progress += dt / COOK_SECONDS;
        if (random() < dt * 6) steam(center.x, center.y - 30);
        if (job.progress >= 1) {
          job.state = 'ready';
          job.readyIn = READY_SECONDS;
          events |= EVENT_WOK_READY;
        }
      } else if (job.state === 'ready') {
        job.readyIn -= dt;
        if (random() < dt * 4) steam(center.x, center.y - 30);
        if (job.readyIn <= 0) {
          job.state = 'burnt';
          state.shake = 0.3;
          events |= EVENT_BURNT;
          addFloater(center.x, center.y - 50, 'Burnt!', '#e5484d');
        }
      }
    });

    updateAmbient(dt);
    return events;
  }

  function updateAmbient(dt) {
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 60 * dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
      const f = state.floaters[i];
      f.life -= dt;
      f.y -= 26 * dt;
      if (f.life <= 0) state.floaters.splice(i, 1);
    }
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);
  }

  return {
    state,
    reset,
    step,
    nearestStation,
    /** True while any wok is cooking, for the sizzle loop. */
    anyCooking() {
      return state.woks.some((w) => w.job && w.job.state === 'cooking');
    },
    /** The dish on the plate, when it is complete and ready to serve. */
    platedDish() {
      const cookedId = state.plate.find((id) => id.startsWith('cooked:'));
      if (!cookedId) return null;
      const dish = DISHES.find((d) => `cooked:${d.id}` === cookedId);
      if (!dish || !state.plate.includes(dish.topping)) return null;
      return dish;
    },
    dishFor,
  };
}
