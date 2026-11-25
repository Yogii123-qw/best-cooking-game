// Dapur Membara: every pixel on the canvas. The kitchen is drawn in a fixed 1280x720
// logical space and scaled to the window, so the game looks the same on any screen.
// All art is vector drawing in code: no image files, nothing fetched.

import {
  FIELD, STATIONS, INGREDIENTS, DISHES, PANTRY_ORDER, PALETTE, FONT, CHEF,
  CHOP_SECONDS, COOK_SECONDS, READY_SECONDS, comboMultiplier,
} from './config.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, weight = 700, align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

function progressRing(ctx, x, y, radius, frac, color) {
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
  ctx.stroke();
}

/** One ingredient drawn small, centred at (x, y) inside a `size` box. */
export function drawIngredient(ctx, id, x, y, size) {
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (id === 'nasi') {
    ctx.fillStyle = '#b8452e';
    ctx.beginPath();
    ctx.arc(0, s * 0.25, s * 0.8, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#f5efe0';
    ctx.beginPath();
    ctx.arc(0, -s * 0.1, s * 0.62, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#d9c9a3';
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.arc(i * s * 0.22, -s * 0.35 - Math.abs(i) * -s * 0.06, s * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'mie') {
    ctx.fillStyle = '#2e5fa3';
    ctx.beginPath();
    ctx.arc(0, s * 0.25, s * 0.8, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#f2c14e';
    ctx.lineWidth = s * 0.16;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(0, -s * 0.1 + i * s * 0.16, s * (0.55 - i * 0.1), Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
    ctx.fillStyle = '#7bc96f';
    ctx.beginPath();
    ctx.arc(s * 0.4, -s * 0.35, s * 0.14, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'ayam') {
    ctx.fillStyle = '#f0a35e';
    ctx.beginPath();
    ctx.arc(-s * 0.15, -s * 0.1, s * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fdf6e3';
    ctx.lineWidth = s * 0.16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s * 0.3, s * 0.3);
    ctx.lineTo(s * 0.7, s * 0.7);
    ctx.stroke();
    ctx.fillStyle = '#fdf6e3';
    ctx.beginPath();
    ctx.arc(s * 0.72, s * 0.72, s * 0.14, 0, Math.PI * 2);
    ctx.arc(s * 0.55, s * 0.85, s * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c96a1e';
    ctx.beginPath();
    ctx.arc(-s * 0.3, -s * 0.25, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'sayur') {
    ctx.fillStyle = '#3e8e41';
    for (let i = 0; i < 3; i += 1) {
      const a = -Math.PI / 2 + (i - 1) * 0.7;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * s * 0.4, Math.sin(a) * s * 0.4 + s * 0.1, s * 0.42, s * 0.2, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#7bc96f';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.25, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'cabai') {
    ctx.strokeStyle = '#e5484d';
    ctx.lineWidth = s * 0.34;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, -s * 0.4);
    ctx.quadraticCurveTo(0, s * 0.5, s * 0.65, -s * 0.55);
    ctx.stroke();
    ctx.strokeStyle = '#3e8e41';
    ctx.lineWidth = s * 0.16;
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, -s * 0.4);
    ctx.quadraticCurveTo(-s * 0.8, -s * 0.7, -s * 0.5, -s * 0.75);
    ctx.stroke();
  } else if (id === 'telur') {
    ctx.fillStyle = '#fdf3d0';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.72, s * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8a838';
    ctx.beginPath();
    ctx.arc(s * 0.1, -s * 0.05, s * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(s * 0.02, -s * 0.14, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'ayamCincang' || id === 'sayurCincang' || id === 'cabaiCincang') {
    const color = INGREDIENTS[id].color;
    ctx.fillStyle = color;
    const cells = [[-0.35, -0.3], [0.25, -0.35], [-0.1, 0.15], [0.4, 0.2], [-0.45, 0.3]];
    for (const [cx, cy] of cells) {
      ctx.save();
      ctx.translate(cx * s, cy * s);
      ctx.rotate(cx);
      ctx.fillRect(-s * 0.24, -s * 0.2, s * 0.48, s * 0.4);
      ctx.restore();
    }
  } else if (typeof id === 'string' && id.startsWith('cooked:')) {
    const dishId = id.slice('cooked:'.length);
    const dish = DISHES.find((d) => d.id === dishId);
    ctx.fillStyle = '#b8452e';
    ctx.beginPath();
    ctx.arc(0, s * 0.3, s * 0.78, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = dish ? '#f2c14e' : '#8a7d6b';
    ctx.beginPath();
    ctx.arc(0, -s * 0.05, s * 0.6, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#e5484d';
    ctx.beginPath();
    ctx.arc(-s * 0.25, -s * 0.3, s * 0.12, 0, Math.PI * 2);
    ctx.arc(s * 0.2, -s * 0.35, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3e8e41';
    ctx.beginPath();
    ctx.arc(s * 0.35, -s * 0.1, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawStationBase(ctx, key, highlight) {
  const s = STATIONS[key];
  ctx.fillStyle = PALETTE.counter;
  roundRect(ctx, s.x, s.y, s.w, s.h, 12);
  ctx.fill();
  ctx.fillStyle = PALETTE.counterTop;
  roundRect(ctx, s.x + 4, s.y + 4, s.w - 8, 22, 8);
  ctx.fill();
  text(ctx, s.label, s.x + s.w / 2, s.y + 21, 14, PALETTE.textLight, 700, 'center');
  if (highlight) {
    ctx.strokeStyle = '#ffd76a';
    ctx.lineWidth = 3;
    roundRect(ctx, s.x - 3, s.y - 3, s.w + 6, s.h + 6, 14);
    ctx.stroke();
  }
}

function drawChef(ctx, chef, tray) {
  const { x, y } = chef;
  ctx.save();
  ctx.translate(x, y);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 20, 24, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body and apron.
  ctx.fillStyle = '#fdf6e3';
  roundRect(ctx, -18, -6, 36, 30, 10);
  ctx.fill();
  ctx.fillStyle = '#2e5fa3';
  ctx.fillRect(-18, 8, 36, 6);
  // Head.
  ctx.fillStyle = '#f2c09a';
  ctx.beginPath();
  ctx.arc(0, -18, 13, 0, Math.PI * 2);
  ctx.fill();
  // Toque.
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, -14, -38, 28, 14, 6);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-8, -38, 7, 0, Math.PI * 2);
  ctx.arc(0, -41, 8, 0, Math.PI * 2);
  ctx.arc(8, -38, 7, 0, Math.PI * 2);
  ctx.fill();
  // Eyes look where the chef faces.
  ctx.fillStyle = '#241a12';
  ctx.beginPath();
  ctx.arc(chef.face * 4 - 4, -18, 2, 0, Math.PI * 2);
  ctx.arc(chef.face * 4 + 4, -18, 2, 0, Math.PI * 2);
  ctx.fill();
  // Tray: a board in front with the carried items on it.
  if (tray.length > 0) {
    ctx.fillStyle = '#8a5a33';
    roundRect(ctx, -26, 2, 52, 12, 4);
    ctx.fill();
    const stepX = tray.length > 1 ? 44 / (tray.length - 1) : 0;
    tray.forEach((id, i) => {
      drawIngredient(ctx, id, -22 + i * stepX, -2, 16);
    });
  }
  ctx.restore();
}

function drawOrderTicket(ctx, order, x, y, w, h) {
  const urgent = order.timeLeft <= 10;
  const frac = Math.max(0, order.timeLeft / order.life);
  ctx.fillStyle = urgent ? PALETTE.ticketUrgent : PALETTE.ticket;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = urgent ? '#e5484d' : '#d9c9a3';
  ctx.lineWidth = urgent ? 2.5 : 1.5;
  roundRect(ctx, x, y, w, h, 10);
  ctx.stroke();
  const dish = DISHES.find((d) => d.id === order.dishId);
  text(ctx, order.name, x + 12, y + 22, 16, PALETTE.text);
  text(ctx, `${Math.ceil(order.timeLeft)}s`, x + w - 10, y + 22, 16, urgent ? '#e5484d' : PALETTE.muted, 800, 'right');
  if (dish) {
    drawIngredient(ctx, dish.base, x + 26, y + 48, 26);
    drawIngredient(ctx, dish.chopped, x + 58, y + 48, 26);
    drawIngredient(ctx, dish.topping, x + 90, y + 48, 26);
    text(ctx, '+', x + 40, y + 54, 14, PALETTE.muted, 800);
    text(ctx, '+', x + 72, y + 54, 14, PALETTE.muted, 800);
  }
  text(ctx, `${order.price}c`, x + w - 10, y + 54, 15, '#c98f1b', 800, 'right');
  ctx.fillStyle = '#e8dcc3';
  roundRect(ctx, x + 12, y + h - 14, w - 24, 6, 3);
  ctx.fill();
  ctx.fillStyle = urgent ? '#e5484d' : '#3e8e41';
  roundRect(ctx, x + 12, y + h - 14, (w - 24) * frac, 6, 3);
  ctx.fill();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    ctx.setTransform(scale, 0, 0, scale, (canvas.width - FIELD.width * scale) / 2, (canvas.height - FIELD.height * scale) / 2);
  }

  function draw(state, screen, best, nearest) {
    fit();
    ctx.clearRect(-80, -80, FIELD.width + 160, FIELD.height + 160);
    const shakeX = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 22 : 0;
    const shakeY = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 22 : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    drawKitchen(state, screen, nearest);
    drawParticles(state);
    drawFloaters(state);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawOver(state, best);
    ctx.restore();
  }

  function drawKitchen(state, screen, nearest) {
    // Wall and floor.
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(0, 0, FIELD.width, 132);
    ctx.fillStyle = PALETTE.wallTrim;
    ctx.fillRect(0, 128, FIELD.width, 6);
    ctx.fillStyle = PALETTE.floor;
    ctx.fillRect(0, 134, FIELD.width, FIELD.height - 134);
    ctx.strokeStyle = PALETTE.floorLine;
    ctx.lineWidth = 1;
    for (let x = 0; x <= FIELD.width; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 134);
      ctx.lineTo(x, FIELD.height);
      ctx.stroke();
    }
    for (let y = 214; y < FIELD.height; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(FIELD.width, y);
      ctx.stroke();
    }

    // Top bar: coins and combo on the left, the day timer on the right.
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, 12, 10, 210, 108, 12);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 1.5;
    roundRect(ctx, 12, 10, 210, 108, 12);
    ctx.stroke();
    text(ctx, 'COINS', 28, 38, 13, '#c9b18a', 800);
    text(ctx, `${state.coins}`, 28, 72, 34, '#f2c14e', 800);
    const mult = comboMultiplier(Math.max(1, state.combo));
    text(ctx, state.combo > 1 ? `COMBO x${state.combo}  (${mult}x)` : 'COMBO --', 28, 100, 14, state.combo > 1 ? '#7bc96f' : PALETTE.muted, 700);

    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, 1058, 10, 210, 108, 12);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    roundRect(ctx, 1058, 10, 210, 108, 12);
    ctx.stroke();
    const mins = Math.floor(state.timeLeft / 60);
    const secs = Math.floor(state.timeLeft % 60);
    text(ctx, 'DAY TIMER', 1163, 38, 13, '#c9b18a', 800, 'center');
    text(ctx, `${mins}:${String(secs).padStart(2, '0')}`, 1163, 74, 34, state.timeLeft <= 30 ? '#e5484d' : PALETTE.textLight, 800, 'center');
    text(ctx, state.rush ? 'RUSH HOUR' : `${state.served} served`, 1163, 100, 14, state.rush ? '#ff9f1c' : PALETTE.muted, 800, 'center');

    // Order board: the tickets.
    text(ctx, 'ORDER BOARD', 640, 30, 13, '#8a7d6b', 800, 'center');
    const ticketW = 250;
    const gap = 14;
    const totalW = 3 * ticketW + 2 * gap;
    const startX = 640 - totalW / 2;
    for (let i = 0; i < 3; i += 1) {
      const order = state.orders[i];
      if (order) drawOrderTicket(ctx, order, startX + i * (ticketW + gap), 40, ticketW, 78);
      else {
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        roundRect(ctx, startX + i * (ticketW + gap), 40, ticketW, 78, 10);
        ctx.fill();
        text(ctx, 'waiting for orders...', startX + i * (ticketW + gap) + ticketW / 2, 84, 14, 'rgba(253,246,227,0.55)', 600, 'center');
      }
    }

    const highlight = screen === SCREEN_PLAY ? nearest ?? null : null;
    drawPantry(state, highlight === 'pantry');
    drawBoard(state, highlight === 'board');
    drawWok(state, 0, highlight === 'wokA');
    drawWok(state, 1, highlight === 'wokB');
    drawPlate(state, highlight === 'plate');
    drawWindow(state, highlight === 'window');
    drawTrash(state, highlight === 'trash');
    drawChef(ctx, state.chef, state.tray);

    // Bottom hint line.
    text(ctx, 'WASD / arrows to walk  ·  E or click a station to use it  ·  1-6 at the pantry  ·  P to pause', 640, 706, 13, 'rgba(253,246,227,0.6)', 600, 'center');
  }

  function drawPantry(state, highlight) {
    drawStationBase(ctx, 'pantry', highlight);
    const s = STATIONS.pantry;
    PANTRY_ORDER.forEach((id, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const cx = s.x + 32 + col * 56;
      const cy = s.y + 58 + row * 66;
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      roundRect(ctx, cx - 26, cy - 30, 52, 60, 8);
      ctx.fill();
      drawIngredient(ctx, id, cx, cy - 4, 34);
      text(ctx, `${i + 1}`, cx - 20, cy + 24, 11, PALETTE.textLight, 800);
      text(ctx, INGREDIENTS[id].name, cx, cy + 26, 10, PALETTE.textLight, 600, 'center');
    });
  }

  function drawBoard(state, highlight) {
    drawStationBase(ctx, 'board', highlight);
    const s = STATIONS.board;
    ctx.fillStyle = PALETTE.board;
    roundRect(ctx, s.x + 18, s.y + 38, s.w - 36, 62, 8);
    ctx.fill();
    if (state.board.item) {
      drawIngredient(ctx, state.board.item, s.x + s.w / 2, s.y + 66, 44);
      progressRing(ctx, s.x + s.w / 2, s.y + 66, 34, state.board.progress, '#e5484d');
      text(ctx, 'chopping...', s.x + s.w / 2, s.y + 118, 12, PALETTE.textLight, 600, 'center');
    } else {
      text(ctx, 'bring something raw', s.x + s.w / 2, s.y + 72, 12, 'rgba(253,246,227,0.75)', 600, 'center');
    }
  }

  function drawWok(state, index, highlight) {
    const key = index === 0 ? 'wokA' : 'wokB';
    drawStationBase(ctx, key, highlight);
    const s = STATIONS[key];
    const wok = state.woks[index];
    const cx = s.x + s.w / 2;
    const cy = s.y + 62;
    // Burner flame.
    ctx.fillStyle = wok.job && wok.job.state === 'cooking' ? PALETTE.flameHot : '#574433';
    ctx.beginPath();
    ctx.moveTo(cx - 26, cy + 22);
    ctx.quadraticCurveTo(cx - 10, cy + 2, cx, cy + 20);
    ctx.quadraticCurveTo(cx + 10, cy + 2, cx + 26, cy + 22);
    ctx.closePath();
    ctx.fill();
    // Wok bowl.
    ctx.fillStyle = PALETTE.wok;
    ctx.beginPath();
    ctx.arc(cx, cy, 34, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#3a3f47';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 34, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    if (wok.job) {
      const job = wok.job;
      if (job.state === 'burnt') {
        ctx.fillStyle = '#17130f';
        ctx.beginPath();
        ctx.arc(cx, cy - 4, 24, Math.PI, 0);
        ctx.fill();
        text(ctx, 'BURNT', cx, cy - 34, 13, '#e5484d', 800, 'center');
      } else {
        drawIngredient(ctx, job.base, cx - 10, cy - 8, 26);
        drawIngredient(ctx, job.chopped, cx + 12, cy - 8, 26);
        if (job.state === 'cooking') {
          progressRing(ctx, cx, cy - 6, 42, job.progress, '#ff9f1c');
        } else {
          ctx.strokeStyle = '#7bc96f';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(cx, cy - 6, 42, 0, Math.PI * 2);
          ctx.stroke();
          text(ctx, 'READY', cx, s.y - 8, 14, '#7bc96f', 800, 'center');
          const barW = 56;
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          roundRect(ctx, cx - barW / 2, cy + 28, barW, 6, 3);
          ctx.fill();
          ctx.fillStyle = '#e5484d';
          roundRect(ctx, cx - barW / 2, cy + 28, barW * Math.max(0, job.readyIn / READY_SECONDS), 6, 3);
          ctx.fill();
        }
      }
    } else {
      text(ctx, 'base + chopped', cx, cy - 2, 11, 'rgba(253,246,227,0.6)', 600, 'center');
    }
  }

  function drawPlate(state, highlight) {
    drawStationBase(ctx, 'plate', highlight);
    const s = STATIONS.plate;
    ctx.fillStyle = PALETTE.plate;
    ctx.beginPath();
    ctx.ellipse(s.x + s.w / 2, s.y + 68, 92, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d9c9a3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(s.x + s.w / 2, s.y + 68, 92, 30, 0, 0, Math.PI * 2);
    ctx.stroke();
    const cx = s.x + s.w / 2;
    const cy = s.y + 66;
    if (state.plate.length === 0) {
      text(ctx, 'assemble the dish here', cx, cy + 4, 12, PALETTE.muted, 600, 'center');
    } else {
      state.plate.forEach((id, i) => {
        drawIngredient(ctx, id, cx - 34 + i * 34, cy, 40);
      });
      const cookedId = state.plate.find((id) => id.startsWith('cooked:'));
      const dish = cookedId ? DISHES.find((d) => `cooked:${d.id}` === cookedId) : null;
      const done = dish !== null && dish !== undefined && state.plate.includes(dish.topping);
      if (done) {
        ctx.strokeStyle = '#7bc96f';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 104, 38, 0, 0, Math.PI * 2);
        ctx.stroke();
        text(ctx, 'READY TO SERVE', cx, s.y + 112, 13, '#7bc96f', 800, 'center');
      }
    }
  }

  function drawWindow(state, highlight) {
    drawStationBase(ctx, 'window', highlight);
    const s = STATIONS.window;
    ctx.fillStyle = '#1d2733';
    roundRect(ctx, s.x + 14, s.y + 36, s.w - 28, 56, 8);
    ctx.fill();
    // A waiting customer silhouette.
    ctx.fillStyle = '#f2c09a';
    ctx.beginPath();
    ctx.arc(s.x + s.w / 2, s.y + 56, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e5484d';
    roundRect(ctx, s.x + s.w / 2 - 16, s.y + 70, 32, 22, 8);
    ctx.fill();
    text(ctx, 'serve here', s.x + s.w / 2, s.y + 116, 12, PALETTE.textLight, 600, 'center');
  }

  function drawTrash(state, highlight) {
    drawStationBase(ctx, 'trash', highlight);
    const s = STATIONS.trash;
    ctx.fillStyle = PALETTE.steelDark;
    roundRect(ctx, s.x + 38, s.y + 44, 54, 58, 8);
    ctx.fill();
    ctx.fillStyle = '#7c838e';
    roundRect(ctx, s.x + 32, s.y + 36, 66, 12, 6);
    ctx.fill();
    text(ctx, 'toss it', s.x + s.w / 2, s.y + 118, 12, PALETTE.textLight, 600, 'center');
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFloaters(state) {
    for (const f of state.floaters) {
      ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
      text(ctx, f.text, f.x, f.y, 17, f.color, 800, 'center');
    }
    ctx.globalAlpha = 1;
  }

  function overlay() {
    ctx.fillStyle = 'rgba(20,14,8,0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function drawTitle(state, best) {
    overlay();
    text(ctx, 'DAPUR MEMBARA', 640, 190, 72, '#f2c14e', 800, 'center');
    text(ctx, 'a timed wok-station cooking game', 640, 232, 22, PALETTE.textLight, 600, 'center');
    const panelX = 340;
    const panelY = 280;
    ctx.fillStyle = 'rgba(253,246,227,0.96)';
    roundRect(ctx, panelX, panelY, 600, 220, 16);
    ctx.fill();
    text(ctx, 'How a service works', 640, panelY + 36, 20, PALETTE.text, 800, 'center');
    const lines = [
      '1. Take ingredients at the pantry (keys 1-6, or click).',
      '2. Chop raw items on the board, then cook base + chopped in a wok.',
      '3. Plate the cooked dish with its topping, serve at the window.',
      '4. Beat the ticket timer. Chains build your combo up to 3x.',
      '5. Watch the wok: a ready dish burns if you leave it.',
    ];
    lines.forEach((line, i) => text(ctx, line, 640, panelY + 70 + i * 26, 16, PALETTE.text, 600, 'center'));
    text(ctx, 'Press Space or click to start', 640, 560, 24, '#ffd76a', 800, 'center');
    if (best > 0) text(ctx, `Best service: ${best} coins`, 640, 596, 16, PALETTE.textLight, 600, 'center');
    text(ctx, 'WASD / arrows to walk  ·  E or click to use a station  ·  P to pause', 640, 640, 15, 'rgba(253,246,227,0.7)', 600, 'center');
  }

  function drawPaused() {
    overlay();
    text(ctx, 'PAUSED', 640, 340, 56, PALETTE.textLight, 800, 'center');
    text(ctx, 'Press P or Space to keep cooking', 640, 390, 20, 'rgba(253,246,227,0.8)', 600, 'center');
  }

  function drawOver(state, best) {
    overlay();
    text(ctx, 'SERVICE OVER', 640, 200, 56, '#f2c14e', 800, 'center');
    text(ctx, `${state.coins} coins earned`, 640, 268, 34, PALETTE.textLight, 800, 'center');
    const rows = [
      `Dishes served: ${state.served}`,
      `Tickets lost: ${state.lost}`,
      `Best service: ${Math.max(best, state.coins)} coins`,
    ];
    rows.forEach((row, i) => text(ctx, row, 640, 330 + i * 34, 20, 'rgba(253,246,227,0.85)', 600, 'center'));
    text(ctx, 'Press Space or click to cook again', 640, 540, 22, '#ffd76a', 800, 'center');
  }

  return { draw };
}
