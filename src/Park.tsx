import { useEffect, useRef, useState } from 'react';
import { Button } from './components/ui/Button';
import { Armchair, LogOut } from 'lucide-react';
import * as T from 'three';
import { Avatar, Stage, stages, koreanHour } from './model';
import { createImageCharacters } from './imageCharacter';
import { loadAvatarLayers } from './modularAvatar';
import { npcAppearance } from './avatarParts';
import { createVillageProps } from './villageProps';
import { CHARACTER_ASSET, loadCharacterAsset, type CharacterRuntime } from './characterAsset';
import type { Participant } from './useTown';
export type Position = { x: number; y: number };
type Props = {
  liveStages: Stage[];
  participants: Participant[];
  demo: boolean;
  avatar: Avatar;
  position: React.MutableRefObject<Position>;
  motion: React.MutableRefObject<Position>;
  onMove: (p: Position) => void;
  onStage: (s: Stage) => void;
  onParticipant: (person: Participant) => void;
  performing: number | null;
  performerIds: string[];
  reaction: { symbol: string; at: number } | null;
};
const world = (p: Position) => new T.Vector3((p.x - 700) / 25, 0, (p.y - 450) / 25);
const STAGE_RADIUS = 2.2;
const STAGE_SURFACE_HEIGHT = 0.24;
export function Park(props: Props) {
  const canvas = useRef<HTMLCanvasElement>(null),
    latest = useRef(props);
  latest.current = props;
  const [error, setError] = useState(false);
  const benchBubble = useRef<HTMLButtonElement>(null);
  const [benchAction, setBenchAction] = useState<'sit' | 'stand' | null>(null);
  const useBench = useRef<() => void>(() => {});
  useEffect(() => {
    const el = canvas.current!;
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({ canvas: el, antialias: true });
    } catch {
      setError(true);
      return;
    }
    const touchDevice = matchMedia('(pointer: coarse)').matches;
    renderer.setPixelRatio(Math.min(devicePixelRatio, touchDevice ? 1.3 : 1.7));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFShadowMap;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    const scene = new T.Scene();
    scene.background = new T.Color('#b9dce0');
    scene.fog = new T.Fog('#b9dce0', 42, 88);
    const camera = new T.PerspectiveCamera(35, 1, 0.1, 140);
    const hemi = new T.HemisphereLight('#fff4db', '#8b9f63', 2.5);
    scene.add(hemi);
    const sun = new T.DirectionalLight('#fff3d3', 3.2);
    sun.position.set(-18, 30, 18);
    sun.castShadow = true;
    const shadowSize = touchDevice ? 1024 : 2048;
    sun.shadow.mapSize.set(shadowSize, shadowSize);
    Object.assign(sun.shadow.camera, {
      left: -40,
      right: 40,
      top: 40,
      bottom: -40,
      near: 1,
      far: 90,
    });
    sun.shadow.normalBias = 0.04;
    scene.add(sun);
    const mats = new Map<string, T.MeshStandardMaterial>();
    const mat = (color: string) => {
      if (!mats.has(color)) mats.set(color, new T.MeshStandardMaterial({ color, roughness: 0.86 }));
      return mats.get(color)!;
    };
    function mesh(
      g: T.BufferGeometry,
      color: string,
      x: number,
      y: number,
      z: number,
      parent: T.Object3D = scene,
    ) {
      const m = new T.Mesh(g, mat(color));
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    }
    function ball(
      x: number,
      y: number,
      z: number,
      sx: number,
      sy: number,
      sz: number,
      color: string,
      parent: T.Object3D = scene,
    ) {
      const m = mesh(new T.SphereGeometry(1, 16, 12), color, x, y, z, parent);
      m.scale.set(sx, sy, sz);
      return m;
    }
    function box(
      x: number,
      y: number,
      z: number,
      sx: number,
      sy: number,
      sz: number,
      color: string,
      parent: T.Object3D = scene,
    ) {
      return mesh(new T.BoxGeometry(sx, sy, sz), color, x, y, z, parent);
    }
    function cyl(
      x: number,
      y: number,
      z: number,
      r1: number,
      r2: number,
      height: number,
      color: string,
      parent: T.Object3D = scene,
    ) {
      return mesh(new T.CylinderGeometry(r1, r2, height, 24), color, x, y, z, parent);
    }
    const scenery = createVillageProps(scene);
    const ground = box(0, -0.35, 0, 100, 0.6, 100, '#ffffff');
    ground.castShadow = false;
    ground.material.map = scenery.ground;
    let seed = 123;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    function path(points: T.Vector3[], width: number) {
      const curve = new T.CatmullRomCurve3(points),
        g = new T.BufferGeometry(),
        v: number[] = [],
        indices: number[] = [];
      for (let i = 0; i <= 100; i++) {
        const p = curve.getPoint(i / 100),
          t = curve.getTangent(i / 100);
        v.push(
          p.x - t.z * width,
          0.015,
          p.z + t.x * width,
          p.x + t.z * width,
          0.015,
          p.z - t.x * width,
        );
        if (i < 100) {
          const n = i * 2;
          indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
        }
      }
      g.setAttribute('position', new T.Float32BufferAttribute(v, 3));
      g.setIndex(indices);
      g.computeVertexNormals();
      const m = new T.Mesh(g, mat('#dcc797'));
      m.material.side = T.DoubleSide;
      m.receiveShadow = true;
      scene.add(m);
    }
    path(
      [
        new T.Vector3(-40, 0, 6),
        new T.Vector3(-15, 0, 5),
        new T.Vector3(0, 0, 3),
        new T.Vector3(17, 0, 12),
        new T.Vector3(40, 0, 13),
      ],
      1.1,
    );
    path(
      [
        new T.Vector3(0, 0, 35),
        new T.Vector3(-2, 0, 12),
        new T.Vector3(0, 0, 0),
        new T.Vector3(-1, 0, -30),
      ],
      1,
    );
    const obstacles: { x: number; z: number; r: number }[] = [];
    function tree(x: number, z: number, s = 1) {
      scenery.prop(Math.round(x + z) % 3 === 0 ? 0 : 2, x, z, 5.1 * s);
      obstacles.push({ x, z, r: s * 0.6 });
    }
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      tree(Math.cos(a) * 27, Math.sin(a) * 24, 1 + random() * 0.3);
    }
    [
      [-14, -4],
      [-11, -15],
      [10, -18],
      [20, -6],
      [-17, 11],
      [13, 18],
      [-8, 18],
    ].forEach(([x, z]) => tree(x, z));
    const water = box(20, -0.025, 0, 8, 0.04, 95, '#78c7cd');
    water.material.roughness = 0.28;
    for (let z = -35; z < 40; z += 1.6) ball(15.8, -0.06, z, 0.7, 0.25, 0.9, '#d3cf9c');
    for (let i = 0; i < 30; i++)
      box(
        17 + random() * 6,
        0.01,
        -30 + random() * 65,
        0.7 + random() * 1.4,
        0.015,
        0.04,
        '#b9e6dc',
      ).castShadow = false;
    scenery.prop(1, -5, -8, 5.3);
    obstacles.push({ x: -5, z: -8, r: 2.5 });
    [
      [-9, -6],
      [-1, -6],
      [-12, 3],
      [8, 8],
      [10, -11],
      [-8, 12],
    ].forEach(([x, z]) => scenery.prop(3, x, z, 1.1));

    for (let x = -20; x < 14; x += 3.4) scenery.prop(5, x, -17, 1.2);
    // A small wooden footbridge makes the river part of the walk.
    for (let x = 15; x < 25.3; x += 0.45) box(x, 0.14, 4.5, 0.42, 0.2, 2.6, '#bd9767');
    for (const z of [3.15, 5.85]) {
      for (let x = 15; x < 25.3; x += 2) cyl(x, 0.65, z, 0.075, 0.075, 1.3, '#a88054');
      box(20, 1.12, z, 10.5, 0.09, 0.09, '#c6a476');
    }

    // Connect the east bank to a walkable riverside clearing.
    for (let z = -35; z < 40; z += 1.6) ball(24.2, -0.06, z, 0.7, 0.25, 0.9, '#d3cf9c');
    path([new T.Vector3(12, 0, 4.5), new T.Vector3(15, 0, 4.5)], 1.1);
    path(
      [
        new T.Vector3(24.5, 0, 4.5),
        new T.Vector3(29, 0, 4.5),
        new T.Vector3(33, 0, 8),
        new T.Vector3(37, 0, 9),
      ],
      1.1,
    );
    path([new T.Vector3(30, 0, -10), new T.Vector3(29, 0, 3), new T.Vector3(31, 0, 15)], 0.8);
    [
      [28, -12],
      [34, -11],
      [39, -6],
      [39, 15],
      [33, 17],
    ].forEach(([x, z]) => tree(x, z));
    [
      [27, 8],
      [35, 12],
      [31, -7],
    ].forEach(([x, z]) => scenery.prop(3, x, z, 1.1));

    path([new T.Vector3(32, 0, 4.5), new T.Vector3(32, 0, 2)], 0.8);
    const stageMeshes: T.Object3D[] = [];
    const stageCenters = latest.current.liveStages.map(world);
    // Leave room for the full bench, the stage edge, and the audience walkway.
    const benches: T.Vector3[] = [];
    for (const [preferredX, preferredZ] of [
      [-15, 6],
      [2, 10],
      [11, -5],
      [36, 4],
    ]) {
      let chosen: T.Vector3 | null = null;
      for (let radius = 0; radius <= 8 && !chosen; radius += 1) {
        for (let step = 0; step < (radius ? 16 : 1); step++) {
          const angle = (step * Math.PI) / 8;
          const x = preferredX + Math.cos(angle) * radius;
          const z = preferredZ + Math.sin(angle) * radius;
          if (x < -17 || x > 37 || z < -10 || z > 12) continue;
          if (x > 14 && x < 26) continue;
          if (stageCenters.some((center) => Math.hypot(x - center.x, z - center.z) < 5)) continue;
          if (obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + 2)) continue;
          if (benches.some((bench) => Math.hypot(x - bench.x, z - bench.z) < 4)) continue;
          chosen = new T.Vector3(x, 0, z);
          break;
        }
      }
      if (chosen) {
        scenery.prop(4, chosen.x, chosen.z, 1.8);
        benches.push(chosen);
      }
    }
    let nearbyBench: T.Vector3 | null = null;
    let seatedBench: T.Vector3 | null = null;
    let standingPosition: Position | null = null;
    let shownBenchAction: 'sit' | 'stand' | null = null;
    const seatPosition = (bench: T.Vector3) => new T.Vector3(bench.x - 0.2, 0, bench.z + 0.25);
    const standUp = (restorePosition: boolean) => {
      if (restorePosition && standingPosition) {
        latest.current.position.current = { ...standingPosition };
        latest.current.onMove({ ...standingPosition });
      }
      seatedBench = null;
      standingPosition = null;
    };
    useBench.current = () => {
      const p = latest.current;
      if (document.querySelector('dialog[open]') || p.performing !== null) return;
      if (seatedBench) {
        standUp(true);
      } else if (nearbyBench && world(p.position.current).distanceTo(nearbyBench) < 2.5) {
        seatedBench = nearbyBench;
        standingPosition = { ...p.position.current };
        const seat = seatPosition(seatedBench);
        p.position.current = { x: seat.x * 25 + 700, y: seat.z * 25 + 450 };
        p.motion.current = { x: 0, y: 0 };
        p.onMove({ ...p.position.current });
      }
    };
    const surfaceHeight = (position: T.Vector3) =>
      stageCenters.some(
        (center) => Math.hypot(position.x - center.x, position.z - center.z) <= STAGE_RADIUS,
      )
        ? STAGE_SURFACE_HEIGHT
        : 0;
    // Shared soft glow for lantern halos and the pools of light beneath them.
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 128;
    const glowContext = glowCanvas.getContext('2d')!;
    const gradient = glowContext.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 224, 157, 0.8)');
    gradient.addColorStop(0.25, 'rgba(255, 200, 112, 0.35)');
    gradient.addColorStop(1, 'rgba(255, 184, 85, 0)');
    glowContext.fillStyle = gradient;
    glowContext.fillRect(0, 0, 128, 128);
    const glowTexture = new T.CanvasTexture(glowCanvas);
    glowTexture.colorSpace = T.SRGBColorSpace;
    const lanternMaterial = new T.MeshStandardMaterial({
      color: '#fff0c2',
      emissive: '#ffcb76',
      emissiveIntensity: 0,
      roughness: 0.4,
    });
    const haloMaterial = new T.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      toneMapped: false,
      opacity: 0.65,
    });
    const poolMaterial = new T.MeshBasicMaterial({
      map: glowTexture,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      toneMapped: false,
      opacity: 0.42,
    });
    const nightLamps: { light: T.PointLight; halo: T.Sprite; pool: T.Mesh }[] = [];
    function streetlamp(x: number, z: number) {
      // Behind the stage, leaving the audience side and microphone unobstructed.
      cyl(x, 0.15, z, 0.25, 0.34, 0.3, '#36474a');
      cyl(x, 1.75, z, 0.065, 0.1, 3.2, '#36474a');
      box(x, 3.3, z, 0.68, 0.12, 0.68, '#36474a');
      const lantern = new T.Mesh(new T.BoxGeometry(0.46, 0.65, 0.46), lanternMaterial);
      lantern.position.set(x, 3.67, z);
      scene.add(lantern);
      for (const dx of [-0.26, 0.26])
        for (const dz of [-0.26, 0.26]) box(x + dx, 3.67, z + dz, 0.05, 0.72, 0.05, '#36474a');
      cyl(x, 4.08, z, 0.04, 0.5, 0.3, '#36474a');
      ball(x, 4.3, z, 0.08, 0.12, 0.08, '#c8aa70');
      const light = new T.PointLight('#ffcf87', 0, 11, 2);
      light.position.set(x, 3.5, z);
      // No additional shadow maps: keep mobile rendering affordable.
      scene.add(light);
      const halo = new T.Sprite(haloMaterial);
      halo.position.set(x, 3.7, z);
      halo.scale.set(2.4, 2.4, 1);
      scene.add(halo);
      const pool = new T.Mesh(new T.PlaneGeometry(9, 9), poolMaterial);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(x, 0.035, z);
      scene.add(pool);
      nightLamps.push({ light, halo, pool });
      obstacles.push({ x, z, r: 0.35 });
    }
    latest.current.liveStages.forEach((s) => {
      const p = world(s),
        pad = cyl(p.x, 0.1, p.z, STAGE_RADIUS, 2.25, 0.2, '#d6b786');
      streetlamp(p.x - 2.8, p.z - 1.7);
      pad.userData.stage = s.id;
      stageMeshes.push(pad);
      for (let i = -3; i <= 3; i++)
        box(
          p.x,
          0.205,
          p.z + i * 0.45,
          Math.sqrt(4.3 - (i * 0.45) ** 2) * 2,
          0.008,
          0.025,
          '#b9976e',
        );
      cyl(p.x + 1.1, 0.9, p.z, 0.035, 0.035, 1.7, '#616957');
      ball(p.x + 1.1, 1.8, p.z, 0.1, 0.17, 0.1, '#4c5549');
      box(p.x - 1.5, 0.4, p.z, 0.45, 0.6, 0.4, '#5d6858');
      ball(p.x - 1.5, 0.42, p.z + 0.21, 0.14, 0.18, 0.02, '#343e36');
    });
    const imageCharacters = createImageCharacters();
    let villagerIndex = 1;
    function character(a: Avatar) {
      return imageCharacters.create(
        a === latest.current.avatar ? a : npcAppearance(villagerIndex++),
      );
    }
    let player = character(latest.current.avatar);
    scene.add(player);
    let avatarKey = JSON.stringify(latest.current.avatar);
    (latest.current.demo ? stages : [])
      .filter((s) => s.artist)
      .forEach((s) => {
        const p = world(s),
          g = character({ ...latest.current.avatar, shirt: s.color, hair: s.id % 3 });
        g.position.copy(p);
        g.position.y = STAGE_SURFACE_HEIGHT;
        scene.add(g);
        for (let j = 0; j < 3; j++) {
          const a = character({
            ...latest.current.avatar,
            shirt: ['#d3b680', '#91a79e', '#ba9cac'][j],
            hair: j,
          });
          a.position.set(p.x + (j - 1) * 1.2, 0, p.z + 3.3 + (j % 2) * 0.4);
          a.rotation.y = Math.PI;
          scene.add(a);
        }
      });
    let asset: CharacterRuntime | null = null,
      alive = true;
    if (CHARACTER_ASSET.url) {
      loadCharacterAsset(CHARACTER_ASSET.url)
        .then((runtime) => {
          if (!alive) {
            runtime.dispose();
            return;
          }
          asset = runtime;
          scene.add(runtime.object);
        })
        .catch((error) =>
          console.error(
            'Character asset could not be activated; retaining prototype model.',
            error,
          ),
        );
    }
    const keys = new Set<string>();
    const down = (e: KeyboardEvent) => {
      if (
        document.querySelector('dialog[open]') ||
        /INPUT|TEXTAREA/.test((e.target as HTMLElement).tagName)
      )
        return;
      if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        keys.add(e.key);
      }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.key);
    const clear = () => {
      keys.clear();
      latest.current.motion.current = { x: 0, y: 0 };
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    window.addEventListener('orientationchange', clear);
    document.addEventListener('visibilitychange', clear);
    const resize = () => {
      if (!el.clientWidth || !el.clientHeight) return;
      renderer.setSize(el.clientWidth, el.clientHeight, false);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    const raycaster = new T.Raycaster();
    const click = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      raycaster.setFromCamera(
        new T.Vector2(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          (-(e.clientY - r.top) / r.height) * 2 + 1,
        ),
        camera,
      );
      const personHit = raycaster.intersectObjects(
        [...visitors.values()].map((v) => v.group),
        true,
      )[0];
      if (personHit) {
        let object: T.Object3D | null = personHit.object;
        while (object && !object.userData.participantId) object = object.parent;
        const person = latest.current.participants.find(
          (p) => p.id === object?.userData.participantId,
        );
        if (person) {
          latest.current.onParticipant(person);
          return;
        }
      }
      const hit = raycaster.intersectObjects(stageMeshes)[0];
      if (hit) {
        const stage = latest.current.liveStages.find((s) => s.id === hit.object.userData.stage);
        if (stage) latest.current.onStage(stage);
      }
    };
    el.addEventListener('click', click);
    let frame = 0,
      last = 0,
      lastMove = 0;
    const focus = world(latest.current.position.current),
      target = new T.Vector3();
    const visitors = new Map<string, { group: T.Group; appearance: string }>();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let entranceReady = false,
      entranceStart: number | null = null;
    void loadAvatarLayers()
      .then(() => {
        entranceReady = true;
      })
      .catch(() => {});
    const entranceMaterial = new T.MeshBasicMaterial({
      color: '#fff2c3',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: T.DoubleSide,
    });
    const entranceRing = new T.Mesh(new T.RingGeometry(0.45, 0.53, 48), entranceMaterial);
    entranceRing.rotation.x = -Math.PI / 2;
    entranceRing.position.copy(world(latest.current.position.current));
    entranceRing.position.y = 0.04;
    scene.add(entranceRing);
    function animate(time: number) {
      if (document.hidden || document.documentElement.dataset.deviceBlocked === 'true') {
        clear();
        last = time;
        frame = requestAnimationFrame(animate);
        return;
      }
      const dt = Math.min((time - last) / 1000, 0.04);
      last = time;
      const p = latest.current,
        key = JSON.stringify(p.avatar);
      const present = new Set(p.participants.map((person) => person.id));
      for (const [id, visitor] of visitors) {
        if (!present.has(id)) {
          scene.remove(visitor.group);
          visitors.delete(id);
        }
      }
      for (const person of p.participants) {
        const appearance = JSON.stringify(person.avatar);
        let visitor = visitors.get(person.id);
        if (!visitor || visitor.appearance !== appearance) {
          if (visitor) scene.remove(visitor.group);
          const group = imageCharacters.create(person.avatar);
          group.userData.participantId = person.id;
          group.position.copy(world(person));
          scene.add(group);
          visitor = { group, appearance };
          visitors.set(person.id, visitor);
        }
        const destination = world(person),
          delta = destination.clone().sub(visitor.group.position);
        if (p.performerIds.includes(person.id)) visitor.group.rotation.y = 0;
        else if (Math.hypot(delta.x, delta.z) > 0.02)
          visitor.group.rotation.y = Math.atan2(delta.x, delta.z);
        visitor.group.position.lerp(destination, 1 - Math.exp(-dt * 6));
        visitor.group.position.y = surfaceHeight(visitor.group.position);
        visitor.group.userData.seated =
          !p.performerIds.includes(person.id) &&
          benches.some((bench) => destination.distanceTo(seatPosition(bench)) < 0.1);
        if (visitor.group.userData.seated) visitor.group.rotation.y = 0;
      }
      if (key !== avatarKey) {
        scene.remove(player);
        player.traverse((o) => {
          if (o instanceof T.Mesh) o.geometry.dispose();
        });
        player = character(p.avatar);
        scene.add(player);
        avatarKey = key;
      }
      let dx =
          p.motion.current.x +
          Number(keys.has('d') || keys.has('ArrowRight')) -
          Number(keys.has('a') || keys.has('ArrowLeft')),
        dz =
          p.motion.current.y +
          Number(keys.has('s') || keys.has('ArrowDown')) -
          Number(keys.has('w') || keys.has('ArrowUp'));
      if (document.querySelector('dialog[open]') || p.performing !== null) {
        dx = 0;
        dz = 0;
      }
      if (seatedBench) {
        // A new performance or server relocation takes precedence over sitting.
        if (
          p.performing !== null ||
          world(p.position.current).distanceTo(seatPosition(seatedBench)) > 0.5
        )
          standUp(false);
        else if (dx || dz) standUp(true);
      }
      const len = Math.hypot(dx, dz);
      if (len > 1) {
        dx /= len;
        dz /= len;
      }
      const next = {
          x: Math.max(240, Math.min(1650, p.position.current.x + dx * 105 * dt)),
          y: Math.max(150, Math.min(790, p.position.current.y + dz * 105 * dt)),
        },
        point = world(next);
      if (
        !(point.x > 15.5 && point.x < 24.5 && (point.z < 3.2 || point.z > 5.8)) &&
        !obstacles.some((o) => Math.hypot(point.x - o.x, point.z - o.z) < o.r + 0.35)
      )
        p.position.current = next;
      if ((dx || dz) && time - lastMove > 70) {
        p.onMove({ ...p.position.current });
        lastMove = time;
      }
      nearbyBench =
        p.performing === null
          ? (benches.find((bench) => world(p.position.current).distanceTo(bench) < 2.5) ?? null)
          : null;
      const action = seatedBench ? 'stand' : nearbyBench ? 'sit' : null;
      if (action !== shownBenchAction) {
        shownBenchAction = action;
        setBenchAction(action);
      }
      player.userData.seated = seatedBench !== null;
      player.position.copy(world(p.position.current));
      player.position.y = surfaceHeight(player.position);
      // Stage performers face the audience, regardless of their approach direction.
      if (p.performing !== null || seatedBench) player.rotation.y = 0;
      else if (dx || dz) player.rotation.y = Math.atan2(dx, dz);
      const walking = !!(dx || dz);
      (player.userData.limbs as T.Object3D[]).forEach((l, i) => {
        l.rotation.x = walking ? Math.sin(time / 130 + (i < 2 ? 0 : Math.PI)) * 0.42 : 0;
      });
      player.position.y += seatedBench
        ? 0
        : walking
          ? Math.abs(Math.sin(time / 130)) * 0.055
          : Math.sin(time / 700) * 0.012;
      if (entranceReady && entranceStart === null) entranceStart = time;
      const arrival = reducedMotion
        ? 1
        : entranceStart === null
          ? 0
          : Math.min(1, (time - entranceStart) / 850);
      const settle = 1 - Math.pow(1 - arrival, 3);
      player.position.y += (1 - settle) * 0.75;
      player.scale.setScalar(0.86 + 0.14 * settle);
      player.traverse((object) => {
        if (object instanceof T.Sprite) object.material.opacity = Math.min(1, arrival * 3);
      });
      entranceRing.visible = arrival > 0 && arrival < 1;
      entranceRing.scale.setScalar(0.6 + arrival * 2.4);
      entranceMaterial.opacity = Math.sin(arrival * Math.PI) * 0.5;
      focus.lerp(player.position, 1 - Math.exp(-dt * 5));
      const portrait = camera.aspect < 1;
      camera.position.set(focus.x, focus.y + (portrait ? 17 : 14), focus.z + (portrait ? 23 : 19));
      target.set(focus.x, focus.y + 0.3, focus.z - 3);
      camera.lookAt(target);
      camera.updateMatrixWorld();
      const bubbleBench = seatedBench ?? nearbyBench;
      if (benchBubble.current) {
        if (bubbleBench && !document.querySelector('dialog[open]')) {
          const anchor = bubbleBench.clone();
          anchor.x += 1.5;
          anchor.y = 1.9;
          anchor.project(camera);
          const x = (anchor.x * 0.5 + 0.5) * el.clientWidth;
          const y = (-anchor.y * 0.5 + 0.5) * el.clientHeight;
          benchBubble.current.style.left = `${x}px`;
          benchBubble.current.style.top = `${y}px`;
          benchBubble.current.style.visibility =
            anchor.z > -1 &&
            anchor.z < 1 &&
            x > 30 &&
            x < el.clientWidth - 30 &&
            y > 65 &&
            y < el.clientHeight - 20
              ? 'visible'
              : 'hidden';
        } else benchBubble.current.style.visibility = 'hidden';
      }
      const night = koreanHour() < 6 || koreanHour() >= 19;
      hemi.intensity = night ? 0.85 : 2.5;
      hemi.color.set(night ? '#8eabed' : '#fff4db');
      hemi.groundColor.set(night ? '#293650' : '#8b9f63');
      sun.intensity = night ? 0.5 : 3.2;
      sun.color.set(night ? '#a9bdff' : '#fff3d3');
      const skyColor = night ? '#101d42' : '#b9dce0';
      (scene.background as T.Color).set(skyColor);
      (scene.fog as T.Fog).color.set(skyColor);
      lanternMaterial.emissiveIntensity = night ? 3 : 0;
      nightLamps.forEach(({ light, halo, pool }) => {
        light.intensity = night ? 45 : 0;
        halo.visible = pool.visible = night;
      });
      scenery.setNight(night);
      document.body.classList.toggle('night', night);
      p.liveStages.forEach((s) => {
        const label = document.getElementById(`label-${s.id}`);
        if (!label) return;
        const v = world(s);
        v.y = 3;
        v.project(camera);
        const x = (v.x * 0.5 + 0.5) * el.clientWidth,
          y = (-v.y * 0.5 + 0.5) * el.clientHeight;
        label.style.left = x + 'px';
        label.style.top = y + 'px';
        label.style.display =
          v.z < 1 && x > 60 && x < el.clientWidth - 60 && y > 85 && y < el.clientHeight - 120
            ? 'block'
            : 'none';
      });
      const react = p.reaction,
        bubble = document.getElementById('player-reaction');
      if (bubble && react) {
        const age = (Date.now() - react.at) / 1000,
          v = player.position.clone();
        v.y += 2.8 + age;
        v.project(camera);
        bubble.style.left = (v.x * 0.5 + 0.5) * el.clientWidth + 'px';
        bubble.style.top = (-v.y * 0.5 + 0.5) * el.clientHeight + 'px';
        bubble.style.opacity = String(Math.max(0, 1 - age / 2));
      }
      if (asset) {
        player.visible = false;
        asset.object.position.copy(player.position);
        asset.object.rotation.y = player.rotation.y + CHARACTER_ASSET.facingRadians;
        asset.update(dt, walking);
      }
      imageCharacters.update(player, walking, time);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => {
      useBench.current = () => {};
      scenery.dispose();
      glowTexture.dispose();
      lanternMaterial.dispose();
      haloMaterial.dispose();
      poolMaterial.dispose();
      entranceMaterial.dispose();
      imageCharacters.dispose();
      alive = false;
      asset?.dispose();
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
      window.removeEventListener('orientationchange', clear);
      document.removeEventListener('visibilitychange', clear);
      el.removeEventListener('click', click);
      scene.traverse((o) => {
        if (o instanceof T.Mesh) o.geometry.dispose();
      });
      mats.forEach((m) => m.dispose());
      renderer.dispose();
    };
  }, []);
  return (
    <>
      <canvas
        ref={canvas}
        id="park"
        aria-label="3D 음악 공원. 조이스틱 또는 방향키로 산책하세요."
      />
      {benchAction && !error && props.performing === null && (
        <Button
          ref={benchBubble}
          className="bench-action"
          style={{ visibility: 'hidden' }}
          aria-label={benchAction === 'stand' ? '의자에서 일어나기' : '의자에 앉기'}
          title={benchAction === 'stand' ? '일어나기' : '앉기'}
          onClick={() => useBench.current()}
        >
          <Armchair size={25} aria-hidden="true" />
          {benchAction === 'stand' && (
            <LogOut className="bench-exit-icon" size={13} aria-hidden="true" />
          )}
        </Button>
      )}
      <span
        id="player-reaction"
        className="player-reaction pointer-events-none absolute z-10"
        aria-hidden="true"
      >
        {props.reaction && (
          <span
            key={props.reaction.at}
            className="reaction-burst"
            data-kind={props.reaction.symbol}
          >
            {[0, 1, 2].map((index) => (
              <img
                key={index}
                src={`/icons/${props.reaction?.symbol === '♡' ? 'heart' : props.reaction?.symbol === '👏' ? 'clap' : 'lightstick'}.png`}
                alt=""
              />
            ))}
          </span>
        )}
      </span>
      {error && (
        <div className="absolute inset-0 grid place-items-center bg-[#e5ead8] p-8 text-center">
          이 브라우저에서 3D를 시작하지 못했어요. WebGL을 지원하는 브라우저에서 다시 열어 주세요.
        </div>
      )}
    </>
  );
}
