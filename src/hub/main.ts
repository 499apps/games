/**
 * Hub page (/games/): 3D shelf of game cartridges plus real, focusable links for every game.
 * Touch, mouse, keyboard and gamepad all move the same selection.
 */
import * as THREE from 'three';
import '../kit/styles.css';
import './hub.css';
import { isDirection, type Action, type InputSource } from '../kit/input';
import { createShell } from '../kit/shell';
import { createStage } from '../kit/stage';
import { GAMES, isPlayable } from './catalog';
import { computeLayout, moveSelection, type TileSlot } from './layout';
import { HubScene } from './scene';

function must<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`hub: missing ${selector}`);
  return el;
}

const stageHost = must<HTMLElement>('#stage');
const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.hub-tile'));

const shell = createShell({
  title: 'Games',
  kind: 'hub',
  container: document.body,
  base: import.meta.env.BASE_URL,
  dev: import.meta.env.DEV,
});

const stage = createStage({
  host: stageHost,
  testMode: shell.testMode,
  reducedMotion: shell.reducedMotion,
  label: 'A toy shelf with a game cartridge for each game',
  fallback: { title: '499apps Games', text: 'Pick a game from the buttons below.' },
  // Bloom only on real highlights (bulbs, the selected strip), not on the lit pastel shells.
  // Neutral tone mapping keeps the pastel shells and previews in colour; ACES washed them white (g7).
  renderer: { fov: 38, toneMapping: THREE.NeutralToneMapping, exposure: 0.85, bloom: { strength: 0.4, radius: 0.45, threshold: 1.15 } },
});

const scene = stage.kit
  ? new HubScene(stage.kit, GAMES, stage.rng, { reducedMotion: shell.reducedMotion })
  : null;

let slots: TileSlot[] = computeLayout(GAMES.length, window.innerWidth / Math.max(1, window.innerHeight)).slots;
let selected = 0;
let actions = 0;
let opening = false;

function setSelected(index: number, sound: boolean): void {
  if (index < 0 || index >= GAMES.length) return;
  const changed = index !== selected;
  selected = index;
  scene?.select(index);
  links.forEach((a, k) => a.classList.toggle('is-selected', k === index));
  if (sound && changed) shell.synth.blip();
  stage.requestRender();
}

/** Hover state of the shelf changed: draw it (frozen test mode draws on demand). */
function hoverTile(index: number | null): void {
  scene?.hover(index);
  stage.requestRender();
}

function nudge(index: number): void {
  const link = links[index];
  if (!link) return;
  link.classList.remove('is-nudged');
  // Restart the CSS wiggle on the next frame.
  requestAnimationFrame(() => link.classList.add('is-nudged'));
}

function openGame(index: number): void {
  const game = GAMES[index];
  if (!game) return;
  setSelected(index, false);
  if (!isPlayable(game) || !game.href) {
    scene?.wobble(index);
    stage.requestRender();
    nudge(index);
    shell.synth.fail();
    return;
  }
  if (opening) return;
  opening = true;
  scene?.press(index);
  stage.requestRender();
  shell.synth.success();
  links[index]?.classList.add('is-opening');
  const href = game.href;
  window.setTimeout(() => location.assign(href), shell.reducedMotion ? 80 : 300);
}

function toNdc(x: number, y: number): { x: number; y: number } {
  const w = Math.max(1, stage.canvas.clientWidth);
  const h = Math.max(1, stage.canvas.clientHeight);
  return { x: (x / w) * 2 - 1, y: -((y / h) * 2 - 1) };
}

function drawerMode(): boolean {
  return getComputedStyle(shell.menu.toggleButton).display !== 'none';
}

function handleAction(action: Action, source: InputSource): void {
  if (isDirection(action)) {
    setSelected(moveSelection(selected, action, slots), true);
    return;
  }
  switch (action) {
    case 'primary': {
      if (source === 'touch' || source === 'pointer') {
        const p = stage.input.pointer;
        if (!p || !scene) return;
        const ndc = toNdc(p.x, p.y);
        const hit = scene.pick(ndc.x, ndc.y);
        if (hit !== null) openGame(hit);
        return;
      }
      openGame(selected);
      return;
    }
    case 'mute':
      shell.synth.toggleMuted();
      return;
    case 'menu':
      // Escape is handled by the menu itself; the gamepad select button toggles the drawer.
      if (source === 'gamepad' && drawerMode()) {
        if (shell.menu.isOpen()) shell.menu.close();
        else shell.menu.open();
      }
      return;
    default:
      return;
  }
}

stage.input.on((action, source) => {
  actions++;
  handleAction(action, source);
});

// Mouse hover: highlight the tile under the cursor and add a gentle parallax.
stage.canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || !scene) return;
  const rect = stage.canvas.getBoundingClientRect();
  const ndc = toNdc(e.clientX - rect.left, e.clientY - rect.top);
  scene.setPointer(ndc.x, ndc.y);
  const hit = scene.pick(ndc.x, ndc.y);
  if (hit !== scene.hoveredIndex && hit !== null) shell.synth.tick();
  hoverTile(hit);
  stage.canvas.style.cursor = hit !== null ? 'pointer' : '';
});
stage.canvas.addEventListener('pointerleave', () => {
  scene?.setPointer(0, 0);
  hoverTile(null);
  stage.canvas.style.cursor = '';
});

links.forEach((link, index) => {
  link.addEventListener('focus', () => setSelected(index, true));
  link.addEventListener('mouseenter', () => hoverTile(index));
  link.addEventListener('mouseleave', () => hoverTile(null));
  link.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    openGame(index);
  });
  // Coming-soon tiles have no href, so Enter and Space need a handler.
  if (!link.hasAttribute('href')) {
    link.addEventListener('keydown', (e) => {
      if (e.code !== 'Enter' && e.code !== 'Space') return;
      e.preventDefault();
      openGame(index);
    });
  }
});

// Back navigation from a game restores a fresh page state.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    opening = false;
    links.forEach((a) => a.classList.remove('is-opening'));
    stage.requestRender();
  }
});

setSelected(0, false);

if (scene) {
  stage.run({
    update: (dt, t) => scene.update(dt, t),
    onResize: (w, h) => {
      const aspect = w / Math.max(1, h);
      scene.layout(aspect);
      slots = computeLayout(GAMES.length, aspect).slots;
    },
  });
}

stage.ready(() => ({
  selected,
  actions,
  hovered: scene ? scene.hoveredIndex : null,
  games: GAMES.length,
}));
