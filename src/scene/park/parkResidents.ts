import * as T from 'three';
import { parkResidents, type ResidentActivity, type ResidentTalk } from '../../data/parkResidents';
import { residentRoute, type GroundPoint } from './residentNavigation';

export type ResidentSeat = { point: T.Vector3; approach: T.Vector3; facing: number; bar: boolean };
type StageSpot = { id: number; point: T.Vector3 };
type Context = {
  night: boolean;
  paused: boolean;
  stages: StageSpot[];
  people: T.Vector3[];
  insideBar: boolean;
};
type Options = {
  scene: T.Scene;
  canvas: HTMLCanvasElement;
  camera: T.Camera;
  seats: ResidentSeat[];
  clear: (point: GroundPoint, night: boolean) => boolean;
  cross: (a: GroundPoint, b: GroundPoint) => boolean;
  insideBar: (p: GroundPoint) => boolean;
  surface: (p: T.Vector3) => number;
  talk: (value: ResidentTalk) => void;
  coffee: GroundPoint;
};
export function createParkResidents(options: Options) {
  const { scene, canvas, camera } = options;
  let disposed = false;
  const textures: T.Texture[] = [];
  const starts = [
    [-12, 5],
    [8, 5],
    [26.8, 5],
    [34, 8],
    [-12, -7],
    [10, -6],
    [12, 8],
    [4, 10],
  ];
  const strolls = [
    [-12, 5],
    [-12, -7],
    [-4, -9],
    [10, -6],
    [12, 8],
    [4, 10],
    [27, 5],
    [34, 9],
  ];
  const layer = document.createElement('div');
  layer.className = 'resident-labels';
  canvas.parentElement!.append(layer);
  const residents = parkResidents.map((definition, i) => {
    const sprite = new T.Sprite(
      new T.SpriteMaterial({
        transparent: true,
        alphaTest: 0.15,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    sprite.center.set(0.5, 0);
    sprite.scale.set(1.6, 2.3, 1);
    sprite.visible = false;
    const group = new T.Group();
    group.name = `resident-${definition.id}`;
    group.position.set(starts[i][0], 0, starts[i][1]);
    group.add(sprite);
    const cup = new T.Mesh(
      new T.CylinderGeometry(0.11, 0.08, 0.22, 12),
      new T.MeshStandardMaterial({ color: '#fff7df', roughness: 0.8 }),
    );
    cup.position.set(0.48, 1.05, 0.2);
    cup.visible = false;
    group.add(cup);
    scene.add(group);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'town-button bench-action resident-chat';
    button.hidden = true;
    const chatIcon = document.createElement('img');
    chatIcon.src = '/icons/chat.png';
    chatIcon.width = chatIcon.height = 18;
    chatIcon.alt = '';
    button.append(chatIcon);
    button.setAttribute('aria-label', `${definition.name}, ${definition.species} 주민과 대화하기`);
    const reaction = document.createElement('span');
    reaction.className = 'resident-reaction';
    reaction.setAttribute('aria-hidden', 'true');
    layer.append(button, reaction);
    const resident = {
      definition,
      group,
      sprite,
      cup,
      button,
      reaction,
      route: [] as GroundPoint[],
      activity: 'walk' as ResidentActivity,
      seat: undefined as ResidentSeat | undefined,
      stage: undefined as number | undefined,
      until: i * 2000,
      nextPlan: i * 1700,
      reactionUntil: 0,
      nextReaction: 0,
      seatedTexture: undefined as T.Texture | undefined,
      standingTexture: undefined as T.Texture | undefined,
      backTexture: undefined as T.Texture | undefined,
      backSeatedTexture: undefined as T.Texture | undefined,
      facingBack: false,
      lastZ: starts[i][1],
      lastX: starts[i][0],
      baseWidth: 1.6,
      arrived: 0,
    };
    button.onclick = () => {
      resident.until = performance.now() + 12000;
      options.talk({ id: definition.id, activity: resident.activity });
    };
    return resident;
  });
  const loader = new T.ImageLoader();
  for (const [url, extra, rear] of [
    ['/art/park-residents.png', false, false],
    ['/art/park-residents-back.png', false, true],
    ['/art/park-residents-extra.png', true, false],
    ['/art/park-residents-extra.png', true, true],
  ] as const)
    loader.load(url, (image) => {
      if (disposed) return;
      const width = image.width / 4;
      const height = image.height / (extra ? 2 : 1);
      residents
        .filter((resident) => 'extra' in resident.definition === extra)
        .forEach((resident) => {
          const source = document.createElement('canvas');
          source.width = width;
          source.height = height;
          const ctx = source.getContext('2d')!;
          ctx.drawImage(
            image,
            resident.definition.column * width,
            extra && rear ? height : 0,
            width,
            height,
            0,
            0,
            width,
            height,
          );
          const pixels = ctx.getImageData(0, 0, width, height).data;
          let left = width,
            right = 0,
            top = height,
            bottom = 0;
          for (let y = 0; y < height; y++)
            for (let x = 0; x < width; x++) {
              if (pixels[(y * width + x) * 4 + 3] < 100) continue;
              left = Math.min(left, x);
              right = Math.max(right, x);
              top = Math.min(top, y);
              bottom = Math.max(bottom, y);
            }
          const cropped = document.createElement('canvas');
          cropped.width = right - left + 1;
          cropped.height = bottom - top + 1;
          cropped
            .getContext('2d')!
            .drawImage(
              source,
              left,
              top,
              cropped.width,
              cropped.height,
              0,
              0,
              cropped.width,
              cropped.height,
            );
          const texture = new T.CanvasTexture(cropped);
          texture.colorSpace = T.SRGBColorSpace;
          textures.push(texture);
          if (rear) resident.backTexture = texture;
          else resident.standingTexture = texture;
          const seated = document.createElement('canvas');
          seated.width = cropped.width;
          seated.height = cropped.height;
          const sit = seated.getContext('2d')!;
          const hips = Math.round(cropped.height * 0.77);
          sit.drawImage(cropped, 0, 0, cropped.width, hips, 0, 0, cropped.width, hips);
          sit.drawImage(
            cropped,
            0,
            hips,
            cropped.width,
            cropped.height - hips,
            0,
            hips,
            cropped.width,
            (cropped.height - hips) * 0.65,
          );
          const seatedTexture = new T.CanvasTexture(seated);
          seatedTexture.colorSpace = T.SRGBColorSpace;
          if (rear) resident.backSeatedTexture = seatedTexture;
          else resident.seatedTexture = seatedTexture;
          textures.push(seatedTexture);
          if (rear) return;
          resident.sprite.material.map = texture;
          resident.sprite.material.needsUpdate = true;
          resident.baseWidth = (2.3 * cropped.width) / cropped.height;
          resident.sprite.scale.set(resident.baseWidth, 2.3, 1);
          resident.sprite.visible = true;
        });
    });
  const free = (seat: ResidentSeat, who: (typeof residents)[number], context: Context) =>
    !context.people.some((p) => p.distanceTo(seat.point) < 0.8) &&
    !residents.some((other) => other !== who && other.seat === seat);
  const plan = (resident: (typeof residents)[number], time: number, context: Context) => {
    if (resident.seat && !resident.route.length)
      resident.group.position.copy(resident.seat.approach);
    resident.seat = undefined;
    resident.stage = undefined;
    const destinations: {
      point: GroundPoint;
      activity: ResidentActivity;
      seat?: ResidentSeat;
      stage?: number;
    }[] = [];
    const coffeeBusy =
      residents.some((other) => other !== resident && other.activity === 'coffee') ||
      context.people.some((p) => Math.hypot(p.x - options.coffee.x, p.z - options.coffee.z) < 1.8);
    if (!coffeeBusy && Math.random() < 0.35)
      destinations.push({ point: options.coffee, activity: 'coffee' });
    if (context.stages.length && Math.random() < 0.7) {
      const stage = context.stages[Math.floor(Math.random() * context.stages.length)];
      const slot = residents.indexOf(resident);
      destinations.push({
        point: {
          x: stage.point.x + ((slot % 4) - 1.5) * 1.1,
          z: stage.point.z + 3.5 + Math.floor(slot / 4) * 1.4 + (slot % 2) * 0.3,
        },
        activity: 'watch',
        stage: stage.id,
      });
    }
    if (Math.random() < 0.6) {
      const seats = options.seats.filter(
        (s) => (!s.bar || context.night) && free(s, resident, context),
      );
      const seat = seats[Math.floor(Math.random() * seats.length)];
      if (seat)
        destinations.push({ point: seat.approach, activity: seat.bar ? 'bar' : 'rest', seat });
    }
    if (Math.random() < 0.35) {
      const friend = residents.find(
        (other) =>
          other !== resident && !other.route.length && !other.seat && other.activity !== 'watch',
      );
      if (friend)
        destinations.push({
          point: { x: friend.group.position.x + 1.2, z: friend.group.position.z },
          activity: 'chat',
        });
    }
    const spot = strolls[Math.floor(Math.random() * strolls.length)];
    destinations.push({ point: { x: spot[0], z: spot[1] }, activity: 'walk' });
    for (const destination of destinations) {
      const route = residentRoute(
        resident.group.position,
        destination.point,
        (p) => options.clear(p, context.night),
        options.cross,
      );
      if (!route) continue;
      resident.route = route;
      resident.activity = destination.activity;
      resident.seat = destination.seat;
      resident.stage = destination.stage;
      resident.until = time + 18000 + Math.random() * 16000;
      return;
    }
    resident.activity = 'walk';
    resident.nextPlan = time + 5000;
  };
  let previousNight: boolean | undefined;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function update(time: number, dt: number, context: Context) {
    if (previousNight !== undefined && previousNight !== context.night) {
      residents.forEach((r) => {
        if (options.insideBar(r.group.position) && !context.night) r.group.position.set(32, 0, 3.5);
        r.route = [];
        r.seat = undefined;
        r.stage = undefined;
        r.until = 0;
      });
    }
    previousNight = context.night;
    for (const resident of residents) {
      if (
        (resident.seat && !free(resident.seat, resident, context)) ||
        (resident.activity === 'coffee' &&
          context.people.some(
            (p) => Math.hypot(p.x - options.coffee.x, p.z - options.coffee.z) < 1.5,
          )) ||
        (resident.stage !== undefined && !context.stages.some((s) => s.id === resident.stage))
      ) {
        if (resident.seat && !resident.route.length)
          resident.group.position.copy(resident.seat.approach);
        resident.seat = undefined;
        resident.stage = undefined;
        resident.route = [];
        resident.until = 0;
      }
      if (!context.paused) {
        if (!resident.route.length && time > resident.until && time > resident.nextPlan)
          plan(resident, time, context);
        const next = resident.route[0];
        if (next) {
          const dx = next.x - resident.group.position.x,
            dz = next.z - resident.group.position.z;
          const distance = Math.hypot(dx, dz),
            stride = Math.min(distance, dt * 1.05);
          if (distance > 0.001) {
            resident.group.position.x += (dx / distance) * stride;
            resident.group.position.z += (dz / distance) * stride;
          }
          if (distance <= stride + 0.01) {
            resident.route.shift();
            if (!resident.route.length) {
              resident.arrived = time;
              if (resident.activity === 'chat') {
                const friend = residents.find(
                  (other) =>
                    other !== resident &&
                    !other.route.length &&
                    !other.seat &&
                    other.group.position.distanceTo(resident.group.position) < 2,
                );
                if (friend) {
                  friend.activity = 'chat';
                  friend.until = time + 14000;
                  friend.nextReaction = time;
                  resident.nextReaction = time + 1200;
                }
              }
              resident.until =
                time + (resident.activity === 'walk' ? 4000 : 18000) + Math.random() * 12000;
              if (resident.seat) resident.group.position.copy(resident.seat.point);
            }
          }
        }
      }
      const moving = resident.route.length > 0;
      const seated = !!resident.seat && !moving;
      const watching = resident.activity === 'watch' && !moving;
      const drinking =
        !moving &&
        ((resident.activity === 'coffee' && time - resident.arrived > 4000) ||
          resident.activity === 'bar');
      resident.cup.visible = drinking;
      resident.cup.position.y =
        1.05 +
        (drinking && !reduced ? Math.max(0, Math.sin((time - resident.arrived) / 900)) * 0.25 : 0);
      resident.cup.rotation.z =
        drinking && !reduced ? Math.max(0, Math.sin((time - resident.arrived) / 900)) * 0.3 : 0;
      const dx = resident.group.position.x - resident.lastX;
      const dz = resident.group.position.z - resident.lastZ;
      if (Math.abs(dz) > 0.001) resident.facingBack = dz < 0;
      if (watching) resident.facingBack = true;
      if (seated) resident.facingBack = Math.cos(resident.seat!.facing) < -0.5;
      resident.lastZ = resident.group.position.z;
      if (Math.abs(dx) > 0.0001) resident.sprite.scale.x = Math.sign(dx) * resident.baseWidth;
      if (seated)
        resident.sprite.scale.x =
          (Math.sin(resident.seat!.facing) < 0 ? -1 : 1) * resident.baseWidth;
      if (drinking) {
        resident.facingBack = false;
        resident.sprite.scale.x = resident.baseWidth;
      }
      resident.lastX = resident.group.position.x;
      resident.sprite.material.map = seated
        ? ((resident.facingBack ? resident.backSeatedTexture : resident.seatedTexture) ??
          resident.seatedTexture ??
          null)
        : ((resident.facingBack ? resident.backTexture : resident.standingTexture) ??
          resident.standingTexture ??
          null);
      resident.sprite.center.y = seated ? 0.22 : 0;
      resident.sprite.position.y = seated
        ? 0.64
        : !reduced && moving
          ? Math.abs(Math.sin(time / 140)) * 0.055
          : 0;
      resident.sprite.material.rotation = reduced
        ? 0
        : moving
          ? Math.sin(time / 140) * 0.035
          : watching
            ? Math.sin(time / 230) * 0.055
            : 0;
      resident.group.position.y = options.surface(resident.group.position);
      resident.sprite.material.color.set(context.night ? '#cbd1e6' : '#ffffff');
      if (!context.paused && !moving && time > resident.nextReaction) {
        const friend = residents.find(
          (other) =>
            other !== resident &&
            !other.route.length &&
            other.group.position.distanceTo(resident.group.position) < 2.2,
        );
        resident.reaction.textContent = watching
          ? ['♥', '♪', '짝짝!'][Math.floor(Math.random() * 3)]
          : resident.activity === 'coffee'
            ? drinking
              ? ''
              : '☕ 커피 기다리는 중 ...'
            : resident.activity === 'bar'
              ? '🥂'
              : friend
                ? '안녕!'
                : '';
        resident.reactionUntil = time + 2200;
        resident.nextReaction = time + 7000 + Math.random() * 7000;
      }
      const projected = resident.group.position.clone();
      projected.y += 2.55;
      projected.project(camera);
      const visible =
        !context.paused &&
        resident.sprite.visible &&
        projected.z > -1 &&
        projected.z < 1 &&
        Math.abs(projected.x) < 1.1 &&
        Math.abs(projected.y) < 1.1 &&
        (!options.insideBar(resident.group.position) || context.insideBar);
      resident.group.visible = !options.insideBar(resident.group.position) || context.insideBar;
      const x = (projected.x * 0.5 + 0.5) * canvas.clientWidth,
        y = (-projected.y * 0.5 + 0.5) * canvas.clientHeight;
      const nearby = context.people[0] && resident.group.position.distanceTo(context.people[0]) < 3;
      resident.button.hidden = !(visible && nearby);
      resident.button.style.display = visible && nearby ? 'flex' : 'none';
      resident.button.style.left = `${x}px`;
      resident.button.style.top = `${y}px`;
      resident.reaction.style.display =
        visible && time < resident.reactionUntil && resident.reaction.textContent ? '' : 'none';
      resident.reaction.style.transform = `translate(${x}px, ${y - 25}px) translate(-50%, -100%)`;
    }
  }
  return {
    update,
    coffeeService(time: number) {
      const customer = residents.find((r) => r.activity === 'coffee' && !r.route.length);
      if (!customer) return null;
      const elapsed = time - customer.arrived;
      return { brewing: elapsed < 4000, progress: Math.min(1, elapsed / 4000) };
    },
    dispose() {
      disposed = true;
      layer.remove();
      textures.forEach((t) => t.dispose());
      residents.forEach((r) => {
        r.group.removeFromParent();
        r.sprite.material.dispose();
        r.cup.geometry.dispose();
        r.cup.material.dispose();
      });
    },
  };
}
