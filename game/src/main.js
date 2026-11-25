// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between four screens: title, play, paused and game over.
//
// ?seed=N fixes the order pattern. ?shot=title|rush|serve|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady for a
// screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BURNT, EVENT_CHOP_DONE, EVENT_ERROR, EVENT_EXPIRED, EVENT_OVER, EVENT_PICKUP, EVENT_RUSH, EVENT_SERVED, EVENT_WARN, EVENT_WOK_READY } from './world.js';
import { ACTION_INTERACT, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function playEvents(events) {
  if (events & EVENT_PICKUP) audio.pickup();
  if (events & EVENT_CHOP_DONE) audio.chopped();
  if (events & EVENT_WOK_READY) audio.ding();
  if (events & EVENT_SERVED) audio.serve();
  if (events & (EVENT_ERROR | EVENT_BURNT)) audio.error();
  if (events & (EVENT_EXPIRED | EVENT_WARN)) audio.alarm();
  if (events & EVENT_RUSH) audio.rush();
  audio.sizzleLoop(world.anyCooking());
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, null);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, (px, py) => {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / 1280, rect.height / 720);
    const ox = (rect.width - 1280 * scale) / 2;
    const oy = (rect.height - 720 * scale) / 2;
    return { x: (px - ox) / scale, y: (py - oy) / scale };
  });
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each serve.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Serve every order before its ticket runs out.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.coins > best) {
      best = world.state.coins;
      saveBest(best);
    }
    announce(`Service over. ${world.state.coins} coins. Best ${best}.`);
  }

  function handleActions(actions) {
    if (actions & ACTION_INTERACT) audio.unlock();
    if (actions & ACTION_INTERACT && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      audio.sizzleLoop(false);
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_INTERACT) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step(actions) {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { mx: 0, my: 0, interact: false, pantryPick: -1, click: null });
      return;
    }
    const move = input.move();
    const click = input.takeClick();
    const events = world.step(STEP, {
      mx: move.x,
      my: move.y,
      interact: Boolean(actions & ACTION_INTERACT),
      pantryPick: input.takePantryPick(),
      click,
    });
    playEvents(events);
    if (events & EVENT_SERVED) announce(`Served. ${world.state.coins} coins.`);
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_EXPIRED) announce('A ticket ran out.');
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // One-shot presses are taken once per frame and handed to the first sub-step,
    // so a press is never lost and never counted twice.
    let actions = input.takeActions();
    const wasPaused = screen === SCREEN_PAUSED;
    handleActions(actions);
    // A press that only resumed the game must not also act in the kitchen.
    if (wasPaused && screen === SCREEN_PLAY) actions = 0;
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      let first = true;
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(first ? actions : 0);
        first = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, screen === SCREEN_PLAY ? world.nearestStation() : null);
  }

  // Leaving the tab pauses a running game rather than letting tickets run out unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      audio.sizzleLoop(false);
      announce('Paused.');
    }
  });

  announce('Dapur Membara. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
