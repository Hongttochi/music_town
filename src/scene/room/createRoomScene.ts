import * as T from 'three';
import { createImageCharacters } from '../avatar/imageCharacter';
import { smoothVelocity, smoothVelocityDelta, WALK_SPEED } from '../avatar/gait';
import type { RoomLayout, RoomSceneProps, RoomTile } from '../../types/room';
import {
  blockingRects,
  clampToRoom,
  collidesCircle,
  findFreePlacement,
  findRoomFurniture,
  rotatedFootprint,
  tileToWorld,
  worldToTile,
} from '../../utils/roomLayout';
import { createFurniture, disposeFurniture, setGhostAppearance } from './furnitureMeshes';

const AVATAR_RADIUS = 0.3;
const ROOM_HALF = 4;
const WALL_HEIGHT = 2.8;

type RoomSceneBindings = {
  el: HTMLCanvasElement;
  latest: React.MutableRefObject<RoomSceneProps>;
  setError: (value: boolean) => void;
};

export function createRoomScene({ el, latest, setError }: RoomSceneBindings) {
  let renderer: T.WebGLRenderer;
  try {
    renderer = new T.WebGLRenderer({ canvas: el, antialias: true });
  } catch {
    setError(true);
    latest.current.onReady?.();
    return () => {};
  }

  const coarsePointer = matchMedia('(pointer: coarse)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new T.Scene();
  scene.background = new T.Color('#e5d3bd');
  const camera = new T.PerspectiveCamera(38, 1, 0.1, 100);
  const cameraTarget = new T.Vector3(0, 0.75, 0);
  const cameraDirection = new T.Vector3(0.62, 0.92, 1).normalize();

  const hemi = new T.HemisphereLight('#fff4df', '#9c7c61', 1.55);
  scene.add(hemi);
  const ambient = new T.AmbientLight('#ffe8d2', 0.22);
  scene.add(ambient);
  const sun = new T.DirectionalLight('#ffe9c7', 2.3);
  sun.position.set(-4.5, 9, 5.5);
  sun.castShadow = true;
  const shadowSize = coarsePointer ? 1024 : 2048;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  Object.assign(sun.shadow.camera, {
    left: -7,
    right: 7,
    top: 7,
    bottom: -7,
    near: 0.5,
    far: 30,
  });
  sun.shadow.normalBias = 0.03;
  sun.target.position.set(0, 0, 0);
  scene.add(sun, sun.target);
  const windowLight = new T.PointLight('#d9eaff', 9, 6, 2);
  windowLight.position.set(1.2, 2, -3.25);
  scene.add(windowLight);

  const textures: T.Texture[] = [];
  const materials = new Map<string, T.MeshStandardMaterial>();
  function material(color: string, roughness = 0.88) {
    const key = `${color}|${roughness}`;
    let result = materials.get(key);
    if (!result) {
      result = new T.MeshStandardMaterial({ color, roughness });
      materials.set(key, result);
    }
    return result;
  }
  function mesh(
    geometry: T.BufferGeometry,
    finish: T.Material,
    x: number,
    y: number,
    z: number,
    castShadow = false,
  ) {
    const part = new T.Mesh(geometry, finish);
    part.position.set(x, y, z);
    part.castShadow = castShadow;
    part.receiveShadow = true;
    scene.add(part);
    return part;
  }
  function box(
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    color: string,
    castShadow = false,
  ) {
    return mesh(new T.BoxGeometry(width, height, depth), material(color), x, y, z, castShadow);
  }

  const floorCanvas = document.createElement('canvas');
  floorCanvas.width = floorCanvas.height = 512;
  const floorContext = floorCanvas.getContext('2d')!;
  for (let row = 0; row < 8; row++) {
    const y = row * 64;
    floorContext.fillStyle = row % 2 === 0 ? '#bd8858' : '#c79563';
    floorContext.fillRect(0, y, 512, 64);
    floorContext.strokeStyle = '#8f613f';
    floorContext.lineWidth = 3;
    floorContext.beginPath();
    floorContext.moveTo(0, y + 1.5);
    floorContext.lineTo(512, y + 1.5);
    floorContext.stroke();
    const offset = row % 2 === 0 ? 0 : 96;
    for (let x = offset; x < 512; x += 192) {
      floorContext.beginPath();
      floorContext.moveTo(x, y);
      floorContext.lineTo(x, y + 64);
      floorContext.stroke();
    }
    floorContext.strokeStyle = 'rgba(115, 72, 42, 0.16)';
    floorContext.lineWidth = 1;
    for (let grain = 0; grain < 7; grain++) {
      const gy = y + 8 + grain * 8;
      floorContext.beginPath();
      floorContext.moveTo(12, gy);
      floorContext.bezierCurveTo(150, gy + 4, 340, gy - 5, 500, gy + 2);
      floorContext.stroke();
    }
  }
  const floorTexture = new T.CanvasTexture(floorCanvas);
  floorTexture.colorSpace = T.SRGBColorSpace;
  floorTexture.wrapS = floorTexture.wrapT = T.RepeatWrapping;
  floorTexture.repeat.set(2, 2);
  textures.push(floorTexture);
  const floorMaterial = new T.MeshStandardMaterial({
    map: floorTexture,
    color: '#ffffff',
    roughness: 0.82,
  });
  const floor = mesh(
    new T.BoxGeometry(ROOM_HALF * 2, 0.12, ROOM_HALF * 2),
    floorMaterial,
    0,
    -0.06,
    0,
  );
  floor.receiveShadow = true;

  box(ROOM_HALF * 2 + 0.16, WALL_HEIGHT, 0.12, 0, WALL_HEIGHT / 2, -ROOM_HALF, '#efd7bd', true);
  box(0.12, WALL_HEIGHT, ROOM_HALF * 2 + 0.16, -ROOM_HALF, WALL_HEIGHT / 2, 0, '#efd7bd', true);
  box(ROOM_HALF * 2 - 0.1, 0.18, 0.06, 0, 0.09, -ROOM_HALF + 0.08, '#f8eddc');
  box(0.06, 0.18, ROOM_HALF * 2 - 0.1, -ROOM_HALF + 0.08, 0.09, 0, '#f8eddc');
  box(ROOM_HALF * 2 - 0.1, 0.05, 0.08, 0, WALL_HEIGHT - 0.06, -ROOM_HALF + 0.08, '#d9b995');
  box(0.08, 0.05, ROOM_HALF * 2 - 0.1, -ROOM_HALF + 0.08, WALL_HEIGHT - 0.06, 0, '#d9b995');

  const windowCanvas = document.createElement('canvas');
  windowCanvas.width = 256;
  windowCanvas.height = 160;
  const windowContext = windowCanvas.getContext('2d')!;
  const sky = windowContext.createLinearGradient(0, 0, 0, 160);
  sky.addColorStop(0, '#bcd9ef');
  sky.addColorStop(0.68, '#e4eef4');
  sky.addColorStop(1, '#d7e5c4');
  windowContext.fillStyle = sky;
  windowContext.fillRect(0, 0, 256, 160);
  windowContext.fillStyle = 'rgba(255,255,255,0.72)';
  windowContext.beginPath();
  windowContext.ellipse(70, 58, 38, 16, 0, 0, Math.PI * 2);
  windowContext.ellipse(96, 52, 26, 13, 0, 0, Math.PI * 2);
  windowContext.fill();
  windowContext.fillStyle = '#8eb47a';
  windowContext.beginPath();
  windowContext.moveTo(0, 128);
  windowContext.quadraticCurveTo(70, 106, 140, 126);
  windowContext.quadraticCurveTo(205, 140, 256, 118);
  windowContext.lineTo(256, 160);
  windowContext.lineTo(0, 160);
  windowContext.fill();
  const windowTexture = new T.CanvasTexture(windowCanvas);
  windowTexture.colorSpace = T.SRGBColorSpace;
  textures.push(windowTexture);
  const windowMaterial = new T.MeshStandardMaterial({
    map: windowTexture,
    emissive: '#d7e8f7',
    emissiveIntensity: 0.35,
    roughness: 0.65,
  });
  mesh(new T.PlaneGeometry(1.8, 1.1), windowMaterial, 1.2, 1.65, -ROOM_HALF + 0.075);
  box(2, 0.08, 0.12, 1.2, 2.24, -ROOM_HALF + 0.11, '#f7ead8');
  box(2, 0.08, 0.12, 1.2, 1.06, -ROOM_HALF + 0.11, '#f7ead8');
  box(0.08, 1.26, 0.12, 0.25, 1.65, -ROOM_HALF + 0.11, '#f7ead8');
  box(0.08, 1.26, 0.12, 2.15, 1.65, -ROOM_HALF + 0.11, '#f7ead8');
  box(0.04, 1.1, 0.08, 1.2, 1.65, -ROOM_HALF + 0.13, '#f7ead8');
  box(1.8, 0.04, 0.08, 1.2, 1.65, -ROOM_HALF + 0.13, '#f7ead8');
  box(2.2, 0.09, 0.28, 1.2, 1.02, -ROOM_HALF + 0.17, '#e4c7a3');

  const door = box(0.04, 2.1, 1.1, -ROOM_HALF + 0.08, 1.05, 2.2, '#a97953', false);
  door.receiveShadow = true;
  box(0.1, 2.24, 0.08, -ROOM_HALF + 0.13, 1.12, 1.63, '#7d5438');
  box(0.1, 2.24, 0.08, -ROOM_HALF + 0.13, 1.12, 2.77, '#7d5438');
  box(0.1, 0.1, 1.22, -ROOM_HALF + 0.13, 2.2, 2.2, '#7d5438');
  const knob = mesh(
    new T.SphereGeometry(0.05, 10, 8),
    material('#e0bd7a', 0.35),
    -ROOM_HALF + 0.16,
    1.04,
    2.62,
  );
  knob.castShadow = true;

  const imageCharacters = createImageCharacters(renderer);
  const initialLayout = latest.current.layout;
  let layoutSignature = layoutSignatureOf(initialLayout);
  let obstacleRects = blockingRects(initialLayout);
  const furnitureGroups = new Map<string, T.Group>();
  let selection: T.LineSegments | null = null;
  let selectionSignature = '';
  let ghostGroup: T.Group | null = null;
  let ghostItem = '';
  let ghostOk: boolean | null = null;

  function layoutSignatureOf(layout: RoomLayout) {
    return layout.items
      .map((item) => `${item.id}:${item.item}:${item.x}:${item.z}:${item.r}`)
      .join('|');
  }

  function placeFurniture(group: T.Group, placed: RoomLayout['items'][number]) {
    const furniture = findRoomFurniture(placed.item);
    if (!furniture) return;
    const { width, depth } = rotatedFootprint(furniture, placed.r);
    group.position.set(placed.x + width / 2 - ROOM_HALF, 0, placed.z + depth / 2 - ROOM_HALF);
    group.rotation.y = (placed.r * Math.PI) / 2;
  }

  function rebuildFurniture(layout: RoomLayout) {
    furnitureGroups.forEach((group) => disposeFurniture(group));
    furnitureGroups.clear();
    for (const placed of layout.items) {
      const group = createFurniture(placed.item);
      group.userData.furnitureId = placed.id;
      placeFurniture(group, placed);
      scene.add(group);
      furnitureGroups.set(placed.id, group);
    }
    obstacleRects = blockingRects(layout);
  }
  rebuildFurniture(initialLayout);

  function syncSelection(layout: RoomLayout, selectedId: string | null, signature: string) {
    const nextSignature = `${selectedId ?? ''}|${signature}`;
    if (nextSignature === selectionSignature) return;
    selectionSignature = nextSignature;
    if (selection) {
      scene.remove(selection);
      selection.geometry.dispose();
      (selection.material as T.Material).dispose();
      selection = null;
    }
    const placed = layout.items.find((item) => item.id === selectedId);
    const furniture = placed ? findRoomFurniture(placed.item) : undefined;
    if (!placed || !furniture) return;
    const { width, depth } = rotatedFootprint(furniture, placed.r);
    const outline = new T.LineSegments(
      new T.EdgesGeometry(new T.BoxGeometry(width, 0.05, depth)),
      new T.LineBasicMaterial({
        color: '#ffca63',
        transparent: true,
        opacity: 0.95,
        depthTest: false,
      }),
    );
    outline.position.set(placed.x + width / 2 - ROOM_HALF, 0.075, placed.z + depth / 2 - ROOM_HALF);
    outline.renderOrder = 5;
    scene.add(outline);
    selection = outline;
  }

  function syncGhost(ghost: RoomSceneProps['ghost']) {
    if (!ghost) {
      if (ghostGroup) {
        disposeFurniture(ghostGroup);
        ghostGroup = null;
      }
      ghostItem = '';
      ghostOk = null;
      return;
    }
    if (!ghostGroup || ghostItem !== ghost.item) {
      if (ghostGroup) disposeFurniture(ghostGroup);
      ghostGroup = createFurniture(ghost.item);
      ghostItem = ghost.item;
      ghostOk = null;
      scene.add(ghostGroup);
    }
    const furniture = findRoomFurniture(ghost.item);
    if (furniture) {
      const { width, depth } = rotatedFootprint(furniture, ghost.r);
      ghostGroup.position.set(
        ghost.x + width / 2 - ROOM_HALF,
        0.015,
        ghost.z + depth / 2 - ROOM_HALF,
      );
      ghostGroup.rotation.y = (ghost.r * Math.PI) / 2;
    }
    if (ghostOk !== ghost.ok) {
      setGhostAppearance(ghostGroup, ghost.ok);
      ghostOk = ghost.ok;
    }
  }

  function startTile(layout: RoomLayout): RoomTile {
    const spot = findFreePlacement(layout, 'chair', 0);
    return spot ?? { x: 4, z: 6 };
  }
  const start = startTile(initialLayout);
  const startWorld = tileToWorld(start.x, start.z);
  const playerPosition = new T.Vector3(startWorld.x, 0, startWorld.z);
  let player = imageCharacters.create(latest.current.avatar);
  player.position.copy(playerPosition);
  scene.add(player);
  let avatarKey = JSON.stringify(latest.current.avatar);
  latest.current.avatarTile.current = worldToTile(playerPosition.x, playerPosition.z);

  let frame = 0;
  let alive = true;
  let last = 0;
  let playerVelocity = { x: 0, z: 0 };
  const keys = new Set<string>();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const raycaster = new T.Raycaster();
  let readyReported = false;
  let lastHover = '';

  const movementKey = (event: KeyboardEvent) =>
    /^Key[WASD]$/.test(event.code) ? event.code.slice(3).toLowerCase() : event.key;
  const editing = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    (target.matches('input, textarea, select') || target.isContentEditable);
  const clear = () => {
    keys.clear();
    playerVelocity = { x: 0, z: 0 };
    latest.current.motion.current = { x: 0, y: 0 };
  };
  const down = (event: KeyboardEvent) => {
    if (
      document.querySelector('dialog[open]') ||
      document.documentElement.dataset.deviceBlocked === 'true' ||
      latest.current.mode === 'decorate' ||
      editing(event.target) ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      keys.clear();
      return;
    }
    const key = movementKey(event);
    if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      event.preventDefault();
      keys.add(key);
    }
  };
  const up = (event: KeyboardEvent) => keys.delete(movementKey(event));
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', clear);
  window.addEventListener('orientationchange', clear);
  document.addEventListener('visibilitychange', clear);
  document.addEventListener('focusin', clear);

  const resize = () => {
    if (!el.clientWidth || !el.clientHeight) return;
    const pixelRatio = Math.min(devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(el.clientWidth, el.clientHeight, false);
    camera.aspect = el.clientWidth / el.clientHeight;
    camera.updateProjectionMatrix();
    updateCamera();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(el);

  const roomCorners = [
    new T.Vector3(-ROOM_HALF, 0, -ROOM_HALF),
    new T.Vector3(ROOM_HALF, 0, -ROOM_HALF),
    new T.Vector3(-ROOM_HALF, 0, ROOM_HALF),
    new T.Vector3(ROOM_HALF, 0, ROOM_HALF),
    new T.Vector3(-ROOM_HALF, WALL_HEIGHT, -ROOM_HALF),
    new T.Vector3(ROOM_HALF, WALL_HEIGHT, -ROOM_HALF),
    new T.Vector3(-ROOM_HALF, WALL_HEIGHT, ROOM_HALF),
    new T.Vector3(ROOM_HALF, WALL_HEIGHT, ROOM_HALF),
  ];
  function updateCamera() {
    const topLimit = 1 - (2 * Math.max(58, el.clientHeight * 0.07)) / el.clientHeight;
    const bottomLimit = 1 - (2 * (el.clientHeight < 520 ? 108 : 122)) / el.clientHeight;
    const limitX = el.clientWidth < 600 ? 0.94 : 0.84;
    const fits = (distance: number) => {
      camera.position.copy(cameraTarget).addScaledVector(cameraDirection, distance);
      camera.lookAt(cameraTarget);
      camera.updateMatrixWorld();
      let maxX = 0;
      let maxY = -Infinity;
      let minY = Infinity;
      for (const corner of roomCorners) {
        const projected = corner.clone().project(camera);
        maxX = Math.max(maxX, Math.abs(projected.x));
        maxY = Math.max(maxY, projected.y);
        minY = Math.min(minY, projected.y);
      }
      return maxX <= limitX && maxY <= topLimit && -minY <= bottomLimit;
    };
    let distance: number;
    if (!fits(30)) distance = 30;
    else if (fits(5)) distance = 5;
    else {
      let near = 5;
      let far = 30;
      for (let step = 0; step < 16; step++) {
        const middle = (near + far) / 2;
        if (fits(middle)) far = middle;
        else near = middle;
      }
      distance = far;
    }
    camera.position.copy(cameraTarget).addScaledVector(cameraDirection, distance);
    camera.lookAt(cameraTarget);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
  }
  resize();

  function pointerCoordinate(event: PointerEvent) {
    const rect = el.getBoundingClientRect();
    return new T.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
  }
  function tileAtPointer(event: PointerEvent): RoomTile | null {
    raycaster.setFromCamera(pointerCoordinate(event), camera);
    const hit = raycaster.intersectObject(floor, false)[0];
    if (!hit) return null;
    const tile = worldToTile(hit.point.x, hit.point.z);
    return tile.x >= 0 && tile.x < 8 && tile.z >= 0 && tile.z < 8 ? tile : null;
  }
  let tapStart: { x: number; y: number; pointerId: number } | null = null;
  const pointerDown = (event: PointerEvent) => {
    if (!event.isPrimary) return;
    tapStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
  };
  const pointerUp = (event: PointerEvent) => {
    if (!event.isPrimary || !tapStart || tapStart.pointerId !== event.pointerId) return;
    const moved = Math.hypot(event.clientX - tapStart.x, event.clientY - tapStart.y);
    tapStart = null;
    if (moved >= 8) return;
    const props = latest.current;
    raycaster.setFromCamera(pointerCoordinate(event), camera);
    if (props.mode === 'walk') {
      if (raycaster.intersectObject(player, true)[0]) props.onAvatarTap();
      return;
    }
    const groups = [...furnitureGroups.values()].filter((group) => group.visible);
    const furnitureHit = raycaster.intersectObjects(groups, true)[0];
    if (furnitureHit) {
      let object: T.Object3D | null = furnitureHit.object;
      while (object && !object.userData.furnitureId) object = object.parent;
      if (object?.userData.furnitureId) props.onSelectItem(object.userData.furnitureId);
      return;
    }
    const tile = tileAtPointer(event);
    if (tile) props.onFloorTap(tile.x, tile.z);
  };
  const pointerMove = (event: PointerEvent) => {
    const props = latest.current;
    if (!finePointer || props.mode !== 'decorate' || !props.ghost) return;
    const tile = tileAtPointer(event);
    if (!tile) return;
    const key = `${tile.x},${tile.z}`;
    if (key === lastHover) return;
    lastHover = key;
    props.onHoverTile(tile.x, tile.z);
  };
  const pointerLeave = () => {
    lastHover = '';
  };
  el.addEventListener('pointerdown', pointerDown);
  el.addEventListener('pointerup', pointerUp);
  el.addEventListener('pointermove', pointerMove);
  el.addEventListener('pointerleave', pointerLeave);

  function animate(time: number) {
    if (
      document.hidden ||
      document.documentElement.dataset.deviceBlocked === 'true' ||
      latest.current.paused
    ) {
      clear();
      last = time;
      frame = requestAnimationFrame(animate);
      return;
    }
    const dt = Math.min((time - last) / 1000, 0.04);
    last = time;
    const props = latest.current;

    const nextLayoutSignature = layoutSignatureOf(props.layout);
    if (nextLayoutSignature !== layoutSignature) {
      layoutSignature = nextLayoutSignature;
      rebuildFurniture(props.layout);
    }
    for (const [id, group] of furnitureGroups) group.visible = id !== props.movingId;
    syncSelection(props.layout, props.selectedId, layoutSignature);
    syncGhost(props.ghost);

    const nextAvatarKey = JSON.stringify(props.avatar);
    if (nextAvatarKey !== avatarKey) {
      const previousRotation = player.rotation.y;
      scene.remove(player);
      player = imageCharacters.create(props.avatar);
      player.position.copy(playerPosition);
      player.rotation.y = previousRotation;
      scene.add(player);
      avatarKey = nextAvatarKey;
    }

    let dx =
      props.motion.current.x +
      Number(keys.has('d') || keys.has('ArrowRight')) -
      Number(keys.has('a') || keys.has('ArrowLeft'));
    let dz =
      props.motion.current.y +
      Number(keys.has('s') || keys.has('ArrowDown')) -
      Number(keys.has('w') || keys.has('ArrowUp'));
    if (
      props.mode === 'decorate' ||
      document.querySelector('dialog[open]') ||
      editing(document.activeElement)
    ) {
      dx = 0;
      dz = 0;
      playerVelocity = { x: 0, z: 0 };
      keys.clear();
    }
    const length = Math.hypot(dx, dz);
    if (length > 1) {
      dx /= length;
      dz /= length;
    }
    const targetVelocity = { x: dx * WALK_SPEED, z: dz * WALK_SPEED };
    const movementDelta = smoothVelocityDelta(playerVelocity, targetVelocity, dt);
    playerVelocity = smoothVelocity(playerVelocity, targetVelocity, dt);
    const tryStep = (stepX: number, stepZ: number) => {
      const next = clampToRoom(playerPosition.x + stepX, playerPosition.z + stepZ, AVATAR_RADIUS);
      if (collidesCircle(obstacleRects, next.x, next.z, AVATAR_RADIUS)) return false;
      playerPosition.x = next.x;
      playerPosition.z = next.z;
      return true;
    };
    const beforeX = playerPosition.x;
    const beforeZ = playerPosition.z;
    if (!tryStep(movementDelta.x, movementDelta.z)) {
      if (!tryStep(movementDelta.x, 0)) tryStep(0, movementDelta.z);
    }
    const movedX = playerPosition.x - beforeX;
    const movedZ = playerPosition.z - beforeZ;
    const moved = Math.hypot(movedX, movedZ);
    if (moved > 0.0001) player.rotation.y = Math.atan2(movedX, movedZ);

    player.position.set(playerPosition.x, 0, playerPosition.z);
    player.userData.walkDistance = moved;
    const walking = moved > 0.0001;
    imageCharacters.update(player, walking, dt, reducedMotion);
    if (!reducedMotion) player.position.y += Number(player.userData.gaitBob) || 0;
    props.avatarTile.current = worldToTile(playerPosition.x, playerPosition.z);

    renderer.render(scene, camera);
    if (!readyReported) {
      readyReported = true;
      requestAnimationFrame(() => {
        if (alive) latest.current.onReady?.();
      });
    }
    frame = requestAnimationFrame(animate);
  }
  frame = requestAnimationFrame(animate);

  return () => {
    alive = false;
    cancelAnimationFrame(frame);
    observer.disconnect();
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('blur', clear);
    window.removeEventListener('orientationchange', clear);
    document.removeEventListener('visibilitychange', clear);
    document.removeEventListener('focusin', clear);
    el.removeEventListener('pointerdown', pointerDown);
    el.removeEventListener('pointerup', pointerUp);
    el.removeEventListener('pointermove', pointerMove);
    el.removeEventListener('pointerleave', pointerLeave);
    furnitureGroups.forEach((group) => disposeFurniture(group));
    furnitureGroups.clear();
    if (ghostGroup) disposeFurniture(ghostGroup);
    if (selection) {
      scene.remove(selection);
      selection.geometry.dispose();
      (selection.material as T.Material).dispose();
    }
    imageCharacters.dispose();
    scene.traverse((object) => {
      if (object instanceof T.Mesh || object instanceof T.LineSegments) {
        object.geometry.dispose();
        const list = Array.isArray(object.material) ? object.material : [object.material];
        list.forEach((finish) => finish.dispose());
      }
    });
    textures.forEach((texture) => texture.dispose());
    materials.forEach((finish) => finish.dispose());
    renderer.dispose();
  };
}
