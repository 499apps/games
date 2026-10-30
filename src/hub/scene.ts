/**
 * Hub scene: a cozy playroom with a glossy arcade marquee and a shelf of big game cartridges.
 * Each cartridge has a glowing screen and a small 3D preview of its game. Rendering only:
 * selection, layout and the catalogue live in pure modules.
 */
import * as THREE from 'three';
import { ParticleSystem } from '../kit/particles';
import type { Rng } from '../kit/prng';
import type { KitRenderer } from '../kit/renderer';
import {
  addStudioLights,
  candyMaterial,
  damp,
  easeOutBack,
  makeRoom,
  matteMaterial,
  roundedBox,
  type StudioLights,
} from '../kit/scene-helpers';
import { funColors, mixHex, palette } from '../kit/theme';
import { isPlayable, type GameEntry } from './catalog';
import { TILE_H, TILE_W, computeLayout, fitCameraDistance, type HubLayout } from './layout';

interface TileRig {
  entry: GameEntry;
  index: number;
  root: THREE.Group;
  body: THREE.Group;
  preview: THREE.Group;
  screenMat: THREE.MeshPhysicalMaterial;
  stripMat: THREE.MeshPhysicalMaterial;
  target: THREE.Vector3;
  sel: number;
  hover: number;
  press: number;
  wobble: number;
  spin: number;
}

export interface HubSceneOptions {
  reducedMotion: boolean;
}

const SHELF_DEPTH = 1.5;
const SHELF_H = 0.3;
/** Share of palette.night mixed into playable tile shells (review H1). */
const SHELL_DEEPEN = 0.12;
/** Shadow map refresh period in frames between layout or selection changes (review H2). */
const SHADOW_EVERY = 4;

function previewColor(entry: GameEntry, hex: string): string {
  return isPlayable(entry) ? hex : mixHex(hex, palette.night, 0.35);
}

function buildColoringPreview(entry: GameEntry): THREE.Group {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, 0.85, 0.66, 0, Math.PI * 2, false, 0);
  const hole = new THREE.Path();
  hole.absarc(0.42, -0.22, 0.13, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const board = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 3,
      curveSegments: 40,
    }),
    candyMaterial(previewColor(entry, mixHex(palette.cream, palette.tangerine, 0.3)), { roughness: 0.4 }),
  );
  board.castShadow = true;
  g.add(board);
  const dabColors = [palette.coral, palette.lemon, palette.lime, palette.sky, palette.bubblegum];
  const dabPos: Array<[number, number]> = [
    [-0.5, 0.18],
    [-0.18, 0.4],
    [0.2, 0.38],
    [0.52, 0.16],
    [-0.42, -0.25],
  ];
  const dabGeo = new THREE.SphereGeometry(0.13, 24, 16);
  dabPos.forEach(([x, y], k) => {
    const color = previewColor(entry, dabColors[k] as string);
    const dab = new THREE.Mesh(dabGeo, candyMaterial(color, { emissive: color, emissiveIntensity: 0.12 }));
    dab.position.set(x, y, 0.15);
    dab.scale.set(1, 1, 0.45);
    dab.castShadow = true;
    g.add(dab);
  });
  const brush = new THREE.Group();
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.07, 1.15, 20),
    candyMaterial(previewColor(entry, palette.tangerine)),
  );
  const ferrule = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.075, 0.18, 20),
    new THREE.MeshPhysicalMaterial({ color: '#d9d9e3', metalness: 1, roughness: 0.25, clearcoat: 0.6 }),
  );
  ferrule.position.y = -0.66;
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.075, 0.3, 20),
    candyMaterial(previewColor(entry, palette.coral), { emissive: palette.coral, emissiveIntensity: 0.15 }),
  );
  tip.rotation.x = Math.PI;
  tip.position.y = -0.9;
  handle.castShadow = true;
  brush.add(handle, ferrule, tip);
  brush.position.set(0.62, 0.2, 0.4);
  brush.rotation.z = 0.75;
  g.add(brush);
  g.rotation.x = -0.18;
  return g;
}

function buildSnakePreview(entry: GameEntry): THREE.Group {
  const g = new THREE.Group();
  const pts: THREE.Vector3[] = [];
  const turns = 2.25;
  const n = 26;
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const a = t * turns * Math.PI * 2 + Math.PI;
    const r = 0.62 - t * 0.2;
    pts.push(new THREE.Vector3(Math.cos(a) * r, -0.62 + t * 0.95, Math.sin(a) * r * 0.75));
  }
  // Rise out of the coil toward the viewer for the head.
  const last = pts[pts.length - 1] as THREE.Vector3;
  pts.push(new THREE.Vector3(last.x * 0.5, last.y + 0.22, 0.45));
  pts.push(new THREE.Vector3(0.05, last.y + 0.3, 0.7));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  // The game's own snake green: pastel lime read pale mint on the real GPU (H1b).
  const bodyColor = previewColor(entry, '#2fc45a');
  const body = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 220, 0.13, 18, false),
    candyMaterial(bodyColor, { emissive: palette.mint, emissiveIntensity: 0.08 }),
  );
  body.castShadow = true;
  g.add(body);
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 12), body.material);
  tail.position.copy(curve.getPoint(0));
  g.add(tail);

  const end = curve.getPoint(1);
  const tangent = curve.getTangent(1);
  const head = new THREE.Group();
  head.position.copy(end);
  head.lookAt(end.clone().add(tangent));
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.21, 28, 20), body.material);
  skull.scale.set(1.15, 0.85, 1.25);
  skull.castShadow = true;
  head.add(skull);
  const eyeWhite = candyMaterial(palette.white, { roughness: 0.2 });
  const pupilMat = candyMaterial(palette.ink, { roughness: 0.1 });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 12), eyeWhite);
    eye.position.set(side * 0.1, 0.1, 0.14);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.038, 14, 10), pupilMat);
    pupil.position.set(side * 0.1, 0.11, 0.205);
    head.add(eye, pupil);
  }
  const tongue = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.018, 0.12, 4, 8),
    candyMaterial(palette.coral, { emissive: palette.coral, emissiveIntensity: 0.3 }),
  );
  tongue.rotation.x = Math.PI / 2;
  tongue.position.set(0, -0.04, 0.31);
  head.add(tongue);
  g.add(head);

  const apple = new THREE.Group();
  const fruit = new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 24, 18),
    candyMaterial(previewColor(entry, palette.coral), { emissive: palette.coral, emissiveIntensity: 0.1 }),
  );
  fruit.scale.set(1, 0.92, 1);
  fruit.castShadow = true;
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), candyMaterial(palette.lime));
  leaf.scale.set(1.4, 0.35, 0.8);
  leaf.position.set(0.06, 0.18, 0);
  leaf.rotation.z = -0.5;
  apple.add(fruit, leaf);
  apple.position.set(-0.62, -0.5, 0.45);
  g.add(apple);
  return g;
}

function buildRocketPreview(entry: GameEntry): THREE.Group {
  const g = new THREE.Group();
  const hull = candyMaterial(previewColor(entry, palette.cream), { roughness: 0.35 });
  const trim = candyMaterial(previewColor(entry, palette.coral));
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.05, 28), hull);
  body.castShadow = true;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.42, 28), trim);
  nose.position.y = 0.73;
  const porthole = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 18, 12),
    candyMaterial(previewColor(entry, palette.sky), { roughness: 0.1 }),
  );
  porthole.position.set(0, 0.2, 0.22);
  porthole.scale.set(1, 1, 0.5);
  g.add(body, nose, porthole);
  const finGeo = roundedBox(0.05, 0.34, 0.3, 0.02, 2);
  for (let k = 0; k < 3; k++) {
    const fin = new THREE.Mesh(finGeo, trim);
    const a = (k / 3) * Math.PI * 2;
    fin.position.set(Math.sin(a) * 0.27, -0.42, Math.cos(a) * 0.27);
    fin.rotation.y = a;
    g.add(fin);
  }
  g.rotation.z = -0.32;
  g.position.y = 0.05;
  return g;
}

/** A small moon lander over a grey regolith pad with one crater. */
function buildLanderPreview(entry: GameEntry): THREE.Group {
  const g = new THREE.Group();
  const foil = candyMaterial(previewColor(entry, palette.lemon), { roughness: 0.3 });
  const frame = candyMaterial(previewColor(entry, palette.cream), { roughness: 0.4 });
  const glass = candyMaterial(previewColor(entry, palette.sky), { roughness: 0.1 });
  const lander = new THREE.Group();
  const body = new THREE.Mesh(roundedBox(0.5, 0.36, 0.5, 0.08, 3), foil);
  body.castShadow = true;
  const cabin = new THREE.Mesh(new THREE.SphereGeometry(0.2, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2), frame);
  cabin.position.y = 0.18;
  cabin.castShadow = true;
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 10), glass);
  visor.position.set(0, 0.26, 0.17);
  visor.scale.set(1, 1, 0.5);
  const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.16, 18, 1, true), frame);
  nozzle.position.y = -0.24;
  lander.add(body, cabin, visor, nozzle);
  const legGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8);
  const padGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.03, 14);
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k / 4) * Math.PI * 2;
    const leg = new THREE.Mesh(legGeo, frame);
    leg.position.set(Math.sin(a) * 0.3, -0.3, Math.cos(a) * 0.3);
    leg.rotation.set(Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5);
    const pad = new THREE.Mesh(padGeo, frame);
    pad.position.set(Math.sin(a) * 0.42, -0.53, Math.cos(a) * 0.42);
    lander.add(leg, pad);
  }
  lander.position.y = 0.22;
  g.add(lander);
  const ground = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.8, 0.12, 32),
    candyMaterial(previewColor(entry, '#a9a5b8'), { roughness: 0.9 }),
  );
  ground.position.y = -0.4;
  ground.receiveShadow = true;
  const crater = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.035, 8, 20), candyMaterial(palette.plum, { roughness: 0.9 }));
  crater.rotation.x = Math.PI / 2;
  crater.position.set(0.45, -0.33, 0.25);
  g.add(ground, crater);
  g.rotation.z = 0.12;
  return g;
}

function buildLockBadge(): THREE.Group {
  const g = new THREE.Group();
  const gold = candyMaterial(palette.lemon, { emissive: palette.tangerine, emissiveIntensity: 0.15 });
  const block = new THREE.Mesh(roundedBox(0.44, 0.36, 0.16, 0.07, 3), gold);
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.04, 12, 28, Math.PI), gold);
  shackle.position.y = 0.17;
  const keyhole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 14), candyMaterial(palette.ink));
  keyhole.rotation.x = Math.PI / 2;
  keyhole.position.z = 0.08;
  block.castShadow = true;
  g.add(block, shackle, keyhole);
  return g;
}

function buildPreview(entry: GameEntry): THREE.Group {
  if (entry.preview === 'coloring') return buildColoringPreview(entry);
  if (entry.preview === 'snake') return buildSnakePreview(entry);
  if (entry.preview === 'lander') return buildLanderPreview(entry);
  return buildRocketPreview(entry);
}

function buildTile(entry: GameEntry, index: number): TileRig {
  const root = new THREE.Group();
  root.name = `tile-${entry.slug}`;
  root.userData['tileIndex'] = index;
  const body = new THREE.Group();
  root.add(body);
  const playable = isPlayable(entry);
  // A touch of night in the pastel shells keeps them below white under the key light.
  const shellColor = mixHex(entry.color, palette.night, playable ? SHELL_DEEPEN : 0.45);

  const shellMat = candyMaterial(shellColor, { clearcoat: 0.6 });
  shellMat.envMapIntensity = 0.45;
  const shell = new THREE.Mesh(roundedBox(TILE_W, TILE_H, 0.55, 0.22, 5), shellMat);
  shell.position.y = TILE_H / 2;
  shell.castShadow = true;
  shell.receiveShadow = true;
  body.add(shell);

  const screenMat = new THREE.MeshPhysicalMaterial({
    color: mixHex(palette.ink, entry.accent, 0.12),
    // Soft gloss only: a mirror clearcoat laid a white veil over the preview (g7).
    roughness: 0.3,
    metalness: 0,
    clearcoat: 0.35,
    clearcoatRoughness: 0.2,
    emissive: new THREE.Color(entry.accent),
    emissiveIntensity: 0.15,
    envMapIntensity: 0.35,
  });
  const screen = new THREE.Mesh(roundedBox(TILE_W - 0.4, TILE_H * 0.56, 0.1, 0.1, 4), screenMat);
  screen.position.set(0, TILE_H * 0.6, 0.27);
  body.add(screen);

  const ridgeMat = candyMaterial(mixHex(shellColor, palette.white, 0.35));
  for (let k = 0; k < 3; k++) {
    const ridge = new THREE.Mesh(roundedBox(TILE_W * 0.55, 0.07, 0.06, 0.03, 2), ridgeMat);
    ridge.position.set(0, 0.42 + k * 0.15, 0.29);
    body.add(ridge);
  }

  const stripMat = new THREE.MeshPhysicalMaterial({
    color: entry.accent,
    emissive: new THREE.Color(entry.accent),
    emissiveIntensity: 0.4,
    roughness: 0.3,
    clearcoat: 1,
  });
  const strip = new THREE.Mesh(roundedBox(TILE_W - 0.3, 0.08, 0.08, 0.035, 2), stripMat);
  strip.position.set(0, 0.16, 0.29);
  body.add(strip);

  const preview = buildPreview(entry);
  // Soft gloss on the preview toys: a mirror coat plus env light made them milky (H1b).
  preview.traverse((o) => {
    const m = (o as THREE.Mesh).material;
    if (m instanceof THREE.MeshPhysicalMaterial) {
      m.clearcoat = Math.min(m.clearcoat, 0.3);
      m.envMapIntensity = 0.35;
    }
  });
  const previewHolder = new THREE.Group();
  previewHolder.position.set(0, TILE_H * 0.6, 0.75);
  previewHolder.scale.setScalar(0.88);
  previewHolder.add(preview);
  body.add(previewHolder);

  if (!playable) {
    const lock = buildLockBadge();
    lock.position.set(TILE_W * 0.3, 0.7, 0.45);
    body.add(lock);
  }

  return {
    entry,
    index,
    root,
    body,
    preview: previewHolder,
    screenMat,
    stripMat,
    target: new THREE.Vector3(),
    sel: 0,
    hover: 0,
    press: 0,
    wobble: 0,
    spin: index * 0.9,
  };
}

export class HubScene {
  private readonly kit: KitRenderer;
  private readonly rng: Rng;
  private readonly reduced: boolean;
  private readonly rigs: TileRig[] = [];
  private readonly world = new THREE.Group();
  private readonly shelves = new THREE.Group();
  private readonly decor = new THREE.Group();
  private readonly room: THREE.Group;
  private readonly lights: StudioLights;
  private readonly particles: ParticleSystem;
  private readonly sparkles: THREE.InstancedMesh;
  private readonly sparkleSeeds: Array<{ x: number; y: number; z: number; speed: number; phase: number; size: number }> = [];
  private readonly bulbs: THREE.MeshBasicMaterial[] = [];
  private readonly marquee = new THREE.Group();
  private readonly raycaster = new THREE.Raycaster();
  private readonly dummy = new THREE.Object3D();
  private readonly camTarget = new THREE.Vector3();
  private readonly camPos = new THREE.Vector3();
  private readonly lookAt = new THREE.Vector3();
  private layoutState: HubLayout;
  private selected = 0;
  private hovered: number | null = null;
  private pointer = { x: 0, y: 0 };
  private firstLayout = true;
  private shadowFrame = 0;
  /** Tier the materials were last set up for (see applyTierLook). */
  private lookTier = '';

  constructor(kit: KitRenderer, games: readonly GameEntry[], rng: Rng, o: HubSceneOptions) {
    this.kit = kit;
    this.rng = rng;
    this.reduced = o.reducedMotion;
    // Shadows are drawn on demand (layout, selection, every SHADOW_EVERY frames): review H2.
    kit.renderer.shadowMap.autoUpdate = false;
    kit.renderer.shadowMap.needsUpdate = true;
    const scene = kit.scene;
    scene.background = new THREE.Color(palette.night);
    scene.fog = new THREE.Fog(palette.night, 36, 80);

    this.lights = addStudioLights(scene, { shadowArea: 10, shadowMapSize: kit.settings.shadowMapSize });
    this.lights.key.castShadow = kit.settings.shadows;
    kit.shadowLights.push(this.lights.key);

    this.room = makeRoom(scene, {
      floorColor: mixHex(palette.plum, palette.night, 0.2),
      wallColor: mixHex(palette.night, palette.plum, 0.45),
      rugColor: mixHex(palette.lavender, palette.plum, 0.35),
    });

    scene.add(this.world);
    this.world.add(this.shelves, this.decor, this.marquee);
    games.forEach((entry, i) => {
      const rig = buildTile(entry, i);
      this.rigs.push(rig);
      this.world.add(rig.root);
    });

    this.buildMarquee();
    this.buildDecor();

    this.particles = new ParticleSystem(rng, { max: 180, particleScale: kit.settings.particleScale, gravity: 6 });
    scene.add(this.particles.mesh);

    const sparkleCount = Math.max(8, Math.round(48 * kit.settings.particleScale));
    this.sparkles = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 8, 6),
      new THREE.MeshBasicMaterial({ color: palette.cream, transparent: true, opacity: 0.85 }),
      sparkleCount,
    );
    this.sparkles.frustumCulled = false;
    for (let k = 0; k < sparkleCount; k++) {
      this.sparkleSeeds.push({
        x: rng.float(-9, 9),
        y: rng.float(-4, 6),
        z: rng.float(-3, 3),
        speed: rng.float(0.05, 0.2),
        phase: rng.float(0, Math.PI * 2),
        size: rng.float(0.015, 0.04),
      });
    }
    scene.add(this.sparkles);

    this.layoutState = computeLayout(games.length, 1.6);
    this.layout(kit.width / Math.max(1, kit.height));
    this.select(0);
  }

  private buildMarquee(): void {
    const sign = new THREE.Mesh(roundedBox(1, 1, 1, 0.12, 4), candyMaterial(palette.plum, { roughness: 0.25 }));
    sign.name = 'marquee-sign';
    sign.castShadow = true;
    this.marquee.add(sign);
    const glow = new THREE.Mesh(
      roundedBox(1, 1, 1, 0.08, 3),
      new THREE.MeshPhysicalMaterial({
        color: mixHex(palette.lemon, palette.tangerine, 0.4),
        emissive: new THREE.Color(palette.tangerine),
        // Warm, not white: the bar clipped to white at 1.1 on a real GPU (review H1).
        emissiveIntensity: 0.3,
        roughness: 0.2,
        clearcoat: 0.3,
      }),
    );
    glow.name = 'marquee-glow';
    this.marquee.add(glow);
    const bulbGeo = new THREE.SphereGeometry(0.075, 14, 10);
    for (let k = 0; k < 14; k++) {
      const color = funColors[k % funColors.length] as string;
      // Bulbs are unlit: a basic material costs almost nothing per pixel (H2-g7). The pulse
      // scales the colour; values above 1 still reach the bloom threshold.
      const mat = new THREE.MeshBasicMaterial({ color });
      mat.userData.base = new THREE.Color(color);
      this.bulbs.push(mat);
      const bulb = new THREE.Mesh(bulbGeo, mat);
      bulb.name = 'marquee-bulb';
      this.marquee.add(bulb);
    }
  }

  private buildDecor(): void {
    const rng = this.rng;
    // Polka dots on the back wall.
    for (let k = 0; k < 14; k++) {
      const r = rng.float(0.25, 0.9);
      const dot = new THREE.Mesh(
        new THREE.CircleGeometry(r, 40),
        matteMaterial(mixHex(funColors[k % funColors.length] as string, palette.night, 0.62), 0.9),
      );
      dot.position.set(rng.float(-14, 14), rng.float(1.5, 9), 0);
      dot.userData['wall'] = true;
      this.decor.add(dot);
    }
    // Toy blocks and balls on the floor.
    for (let k = 0; k < 7; k++) {
      const color = funColors[(k * 3) % funColors.length] as string;
      const toy =
        k % 3 === 2
          ? new THREE.Mesh(new THREE.SphereGeometry(0.34, 28, 20), candyMaterial(color))
          : new THREE.Mesh(roundedBox(0.62, 0.62, 0.62, 0.1, 3), candyMaterial(color));
      toy.castShadow = true;
      toy.receiveShadow = true;
      toy.rotation.y = rng.float(0, Math.PI);
      toy.userData['floor'] = { side: k % 2 === 0 ? -1 : 1, out: rng.float(0.6, 2.8), z: rng.float(0.6, 2.6), stack: k === 3 ? 1 : 0 };
      this.decor.add(toy);
    }
  }

  /** Re-arrange for a new aspect ratio (portrait uses two columns). */
  layout(aspect: number): void {
    const l = computeLayout(this.rigs.length, aspect);
    this.layoutState = l;
    for (const rig of this.rigs) {
      const slot = l.slots[rig.index];
      if (!slot) continue;
      rig.target.set(slot.x, slot.y, 0);
      if (this.firstLayout) rig.root.position.copy(rig.target);
    }

    for (const child of [...this.shelves.children]) {
      const mesh = child as THREE.Mesh;
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      this.shelves.remove(mesh);
    }
    const shelfMat = candyMaterial(mixHex(palette.coral, palette.plum, 0.5), { roughness: 0.45, clearcoat: 0.6 });
    for (let r = 0; r < l.rows; r++) {
      const rowSlots = l.slots.filter((s) => s.row === r);
      const minX = Math.min(...rowSlots.map((s) => s.x)) - TILE_W / 2;
      const maxX = Math.max(...rowSlots.map((s) => s.x)) + TILE_W / 2;
      const shelf = new THREE.Mesh(roundedBox(maxX - minX + 1.1, SHELF_H, SHELF_DEPTH, 0.12, 3), r === 0 ? shelfMat : shelfMat.clone());
      shelf.position.set((minX + maxX) / 2, -r * 4.4 - SHELF_H / 2, 0.1);
      shelf.castShadow = true;
      shelf.receiveShadow = true;
      this.shelves.add(shelf);
    }

    const bottomY = -(l.rows - 1) * 4.4 - SHELF_H;
    const floorY = bottomY - 2.6;
    this.room.position.set(0, floorY, 11);

    // Marquee above the top row.
    const signW = l.width + 1.2;
    const signY = TILE_H + 1.05;
    const sign = this.marquee.getObjectByName('marquee-sign');
    const glow = this.marquee.getObjectByName('marquee-glow');
    sign?.scale.set(signW, 0.95, 0.35);
    sign?.position.set(0, signY, -0.35);
    glow?.scale.set(signW - 0.5, 0.16, 0.12);
    glow?.position.set(0, signY, -0.12);
    const bulbs = this.marquee.children.filter((c) => c.name === 'marquee-bulb');
    bulbs.forEach((b, k) => {
      const half = Math.ceil(bulbs.length / 2);
      const top = k < half;
      const j = top ? k : k - half;
      const count = top ? half : bulbs.length - half;
      const x = -signW / 2 + 0.35 + (j * (signW - 0.7)) / Math.max(1, count - 1);
      b.position.set(x, signY + (top ? 0.36 : -0.36), -0.12);
    });

    // Decor follows the layout.
    for (const child of this.decor.children) {
      if (child.userData['wall']) {
        child.position.z = -4 + 0.01;
      } else {
        const f = child.userData['floor'] as { side: number; out: number; z: number; stack: number };
        const geo = (child as THREE.Mesh).geometry;
        geo.computeBoundingBox();
        const h = geo.boundingBox ? geo.boundingBox.max.y : 0.3;
        child.position.set(f.side * (l.width / 2 + f.out), floorY + h + f.stack * 0.62, f.z);
      }
    }

    // Light and camera framing.
    const centerY = l.centerY + TILE_H / 2;
    this.lights.key.position.set(6, centerY + 10, 9);
    this.lights.key.target.position.set(0, centerY, 0);
    this.lights.fill.position.set(-4, centerY + 2, 6);
    this.lights.rim.position.set(-7, centerY + 6, -5);

    const fov = this.kit.camera.fov;
    const portrait = aspect < 1;
    const frameW = l.width + 1.4;
    const frameH = l.height + (portrait ? 3.6 : 2.6);
    const dist = fitCameraDistance(frameW, frameH, fov, aspect, portrait ? 1.22 : 1.12);
    this.lookAt.set(0, centerY + 0.35, 0);
    this.camTarget.set(0, centerY + 0.35 + dist * 0.12, dist);
    if (this.firstLayout) {
      this.camPos.copy(this.camTarget);
      this.applyCamera(0);
    }
    this.firstLayout = false;
    this.requestShadow();
  }

  get selectedIndex(): number {
    return this.selected;
  }

  get hoveredIndex(): number | null {
    return this.hovered;
  }

  select(index: number): void {
    if (index < 0 || index >= this.rigs.length) return;
    if (index !== this.selected) this.requestShadow();
    this.selected = index;
  }

  hover(index: number | null): void {
    this.hovered = index;
  }

  /** Pointer position in normalised device coordinates, for a gentle parallax. */
  setPointer(ndcX: number, ndcY: number): void {
    this.pointer.x = Math.max(-1, Math.min(1, ndcX));
    this.pointer.y = Math.max(-1, Math.min(1, ndcY));
  }

  press(index: number): void {
    const rig = this.rigs[index];
    if (!rig) return;
    rig.press = 1;
    this.burst(rig, this.reduced ? 8 : 30);
  }

  wobble(index: number): void {
    const rig = this.rigs[index];
    if (!rig) return;
    rig.wobble = 1;
  }

  /** Tile under a point in normalised device coordinates, or null. */
  pick(ndcX: number, ndcY: number): number | null {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.kit.camera);
    const hits = this.raycaster.intersectObjects(
      this.rigs.map((r) => r.root),
      true,
    );
    for (const hit of hits) {
      let o: THREE.Object3D | null = hit.object;
      while (o) {
        const idx = o.userData['tileIndex'];
        if (typeof idx === 'number') return idx;
        o = o.parent;
      }
    }
    return null;
  }

  private burst(rig: TileRig, count: number): void {
    const pos = new THREE.Vector3();
    rig.preview.getWorldPosition(pos);
    pos.z += 0.4;
    this.particles.burst({ position: pos, color: rig.entry.accent, count, speed: 3.4, life: 0.8, size: 0.07 });
    this.particles.burst({
      position: pos,
      color: this.rng.pick(funColors),
      count: Math.round(count / 2),
      speed: 2.6,
      life: 0.7,
      size: 0.05,
    });
  }

  private applyCamera(dt: number): void {
    const cam = this.kit.camera;
    const k = dt === 0 ? 1 : 1 - Math.exp(-4 * dt);
    this.camPos.lerp(this.camTarget, k);
    const px = this.reduced ? 0 : this.pointer.x * 0.35;
    const py = this.reduced ? 0 : this.pointer.y * 0.2;
    cam.position.set(this.camPos.x + px, this.camPos.y + py, this.camPos.z);
    cam.lookAt(this.lookAt);
  }

  update(dt: number, t: number): void {
    const motion = this.reduced ? 0 : 1;
    // dt = 0 happens on the first frame and with the frozen test clock: settle at once.
    const settle = dt === 0;
    for (const rig of this.rigs) {
      const isSel = rig.index === this.selected ? 1 : 0;
      const isHover = rig.index === this.hovered ? 1 : 0;
      rig.sel = settle ? isSel : damp(rig.sel, isSel, 9, dt);
      rig.hover = settle ? isHover : damp(rig.hover, isHover, 12, dt);
      rig.press = Math.max(0, rig.press - dt * 2.8);
      rig.wobble = Math.max(0, rig.wobble - dt * 1.8);

      if (settle) rig.root.position.copy(rig.target);
      rig.root.position.x = damp(rig.root.position.x, rig.target.x, 7, dt);
      rig.root.position.y = damp(rig.root.position.y, rig.target.y, 7, dt);

      const bob = Math.sin(t * 1.3 + rig.index * 1.7) * 0.05 * motion;
      const pressCurve = Math.sin(rig.press * Math.PI);
      const lift = 0.24 * easeOutBack(rig.sel) + 0.08 * rig.hover;
      rig.body.position.y = bob + lift + pressCurve * 0.12;
      const s = 1 + 0.05 * rig.sel + 0.02 * rig.hover;
      const squash = pressCurve * 0.1;
      rig.body.scale.set(s * (1 + squash * 0.6), s * (1 - squash), s * (1 + squash * 0.6));
      rig.body.rotation.z = Math.sin(rig.wobble * 26) * 0.12 * rig.wobble;
      rig.body.rotation.y = Math.sin(t * 0.6 + rig.index) * 0.06 * motion + rig.sel * 0.04 * Math.sin(t * 1.1) * motion;

      rig.spin += dt * (this.reduced ? 0.2 * rig.sel : 0.35 + 1.1 * rig.sel);
      rig.preview.rotation.y = Math.sin(rig.spin) * 0.55;
      rig.preview.position.y = TILE_H * 0.6 + Math.sin(t * 2 + rig.index) * 0.04 * motion * (0.5 + rig.sel);

      // A small lift for the selected screen: a strong glow washed the preview out (H1b).
      const pulse = this.reduced ? 0 : Math.sin(t * 3.2) * 0.05 * rig.sel;
      rig.screenMat.emissiveIntensity = 0.14 + 0.15 * rig.sel + 0.08 * rig.hover + pulse;
      rig.stripMat.emissiveIntensity = 0.35 + 1.0 * rig.sel + 0.4 * rig.hover;
    }

    this.bulbs.forEach((m, k) => {
      const level = this.reduced ? 1.0 : 0.7 + 0.6 * (0.5 + 0.5 * Math.sin(t * 2.4 + k * 0.9));
      m.color.copy(m.userData.base as THREE.Color).multiplyScalar(1.4 * level);
    });

    const count = this.sparkles.count;
    for (let k = 0; k < count; k++) {
      const s = this.sparkleSeeds[k];
      if (!s) continue;
      const rise = this.reduced ? 0 : ((t * s.speed + s.phase) % 1) * 10;
      const y = this.layoutState.centerY - 4 + ((s.y + 4 + rise) % 10);
      this.dummy.position.set(
        s.x + Math.sin(t * 0.5 + s.phase) * 0.3 * motion,
        y,
        s.z,
      );
      const twinkle = this.reduced ? 1 : 0.6 + 0.4 * Math.sin(t * 3 + s.phase * 5);
      this.dummy.scale.setScalar(s.size * twinkle);
      this.dummy.updateMatrix();
      this.sparkles.setMatrixAt(k, this.dummy.matrix);
    }
    this.sparkles.instanceMatrix.needsUpdate = true;

    this.particles.update(dt);
    this.applyCamera(dt);
    this.applyTierLook();

    // Tiles only bob a few centimetres, so the shadow map refreshes every few frames, not
    // every frame. A tier change drops the map; draw a new one at once.
    this.shadowFrame = (this.shadowFrame + 1) % SHADOW_EVERY;
    if (this.shadowFrame === 0 || this.lights.key.shadow.map === null) this.requestShadow();
  }

  /**
   * At tier low, drop the clearcoat layer (a second specular pass on every pixel) so a busy
   * integrated GPU keeps 60 fps (H2-g7). Restored when the tier rises again.
   */
  private applyTierLook(): void {
    const tier = this.kit.settings.tier;
    if (tier === this.lookTier) return;
    this.lookTier = tier;
    const low = tier === 'low';
    this.kit.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material;
      if (!(m instanceof THREE.MeshPhysicalMaterial)) return;
      if (m.userData.coat === undefined) m.userData.coat = m.clearcoat;
      m.clearcoat = low ? 0 : (m.userData.coat as number);
    });
  }

  private requestShadow(): void {
    this.kit.renderer.shadowMap.needsUpdate = true;
  }
}
