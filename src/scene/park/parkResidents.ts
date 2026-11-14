import {
  composeResidentWalking,
  RESIDENT_WALK_FRAMES,
  RESIDENT_WALK_PERIOD,
} from './residentWalking';
import {
  residentFrame,
  residentPose,
  residentDrinkPose,
  faceResidentTexture,
  type ResidentFrame,
  type ResidentPose,
} from './residentAnimation';
import { residentFacing, residentSeatFacing } from './residentFacing';
import { spriteHeadAnchor } from './spriteHeadAnchor';
import * as T from 'three';
import { parkResidents, type ResidentActivity, type ResidentTalk } from '../../data/parkResidents';
import { residentRoute, residentSafePosition, type GroundPoint } from './residentNavigation';

export type ResidentSeat = { point: T.Vector3; approach: T.Vector3; facing: number; bar: boolean };
type StageSpot = { id: number; point: T.Vector3 };
type Context = {
  talkingResidentId?: string;
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
    button.className = 'town-button bench-action npc-action resident-chat';
    button.hidden = true;
    const chatIcon = document.createElement('img');
    chatIcon.src = '/icons/chat.png';
    chatIcon.width = chatIcon.height = 18;
    chatIcon.alt = '';
    const name = document.createElement('span');
    name.textContent = definition.name;
    button.append(chatIcon, name);
    button.setAttribute('aria-label', `${definition.name}, ${definition.species} 주민과 대화하기`);
    const reaction = document.createElement('span');
    reaction.className = 'resident-reaction';
    reaction.setAttribute('aria-hidden', 'true');
    const reactionIcon = document.createElement('img');
    reactionIcon.width = reactionIcon.height = 20;
    reactionIcon.alt = '';
    const reactionLabel = document.createElement('span');
    reaction.append(reactionIcon, reactionLabel);
    layer.append(button, reaction);
    const resident = {
      definition,
      group,
      sprite,
      cup,
      button,
      reaction,
      reactionIcon,
      reactionLabel,
      reactionText: '',
      route: [] as GroundPoint[],
      activity: 'walk' as ResidentActivity,
      seat: undefined as ResidentSeat | undefined,
      stage: undefined as number | undefined,
      until: i * 2000,
      nextPlan: i * 1700,
      nextRecovery: 0,
      reactionUntil: 0,
      nextReaction: 0,
      poses: {} as Partial<Record<ResidentPose, ResidentFrame>>,
      animationTime: i * 613,
      gait: {} as Record<number, ResidentFrame[]>,
      standingTexture: undefined as T.Texture | undefined,
      backTexture: undefined as T.Texture | undefined,
      facingBack: false,
      facingSide: 0,
      sideTexture: undefined as T.Texture | undefined,
      sideWidth: 1.6,
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
  for (const [url, extra, kind] of [
    ['/art/park-residents-simple.png', false, 'base'],
    ['/art/park-residents-extra-simple.png', true, 'base'],
    ['/art/park-residents-motion.png', false, 'motion'],
    ['/art/park-residents-extra-motion.png', true, 'motion'],
    ['/art/park-residents-seated-side.png', false, 'seatedSide'],
    ['/art/park-residents-seated-side.png', true, 'seatedSide'],
    ['/art/park-residents-seated-back.png', false, 'seatedBack'],
    ['/art/park-residents-seated-back.png', true, 'seatedBack'],
    ['/art/park-residents-drinking.png', false, 'drink'],
    ['/art/park-residents-drinking.png', true, 'drink'],
  ] as const) {
    loader.load(url, (image) => {
      if (disposed) return;
      residents
        .filter((resident) => 'extra' in resident.definition === extra)
        .forEach((resident) => {
          const rows =
            kind === 'drink'
              ? 4
              : kind === 'motion'
                ? 5
                : kind === 'seatedSide' || kind === 'seatedBack'
                  ? 2
                  : 3;
          for (let row = 0; row < rows; row++) {
            if (kind === 'drink' && Math.floor(row / 2) !== (extra ? 1 : 0)) continue;
            if ((kind === 'seatedSide' || kind === 'seatedBack') && row !== (extra ? 1 : 0))
              continue;
            const frame = residentFrame(
              image,
              resident.definition.column,
              row,
              rows,
              kind === 'seatedSide' || kind === 'seatedBack' || (kind === 'motion' && row === 2)
                ? 1.95
                : 2.3,
            );
            textures.push(frame.texture);
            if (kind === 'base') {
              const legTop = extra
                ? [row === 1 ? 0.92 : 0.9, 0.92, 0.84, 0.94][resident.definition.column]
                : [0.81, 0.87, 0.87, 0.86][resident.definition.column];
              resident.gait[row] = composeResidentWalking(
                frame.texture.image as HTMLCanvasElement,
                row === 1,
                legTop,
              ).map((canvas) => {
                const texture = new T.CanvasTexture(canvas);
                texture.colorSpace = T.SRGBColorSpace;
                textures.push(texture);
                return { texture, width: (2.3 * canvas.width) / canvas.height, height: 2.3 };
              });
            }
            if (kind === 'drink') {
              resident.poses[row % 2 === 0 ? 'drinkHold' : 'drinkSip'] = frame;
            } else if (kind === 'seatedSide' || kind === 'seatedBack') {
              resident.poses[kind === 'seatedSide' ? 'sitSide' : 'sitBack'] = frame;
            } else if (kind === 'motion') {
              const pose = (['walkA', 'walkB', 'sit', 'happy', 'blink'] as const)[row];
              resident.poses[pose] = frame;
            } else if (row === 1) {
              resident.sideTexture = frame.texture;
              resident.sideWidth = frame.width;
            } else if (row === 2) resident.backTexture = frame.texture;
            else {
              resident.standingTexture = frame.texture;
              resident.baseWidth = frame.width;
              resident.sprite.material.map = frame.texture;
              resident.sprite.material.needsUpdate = true;
              resident.sprite.scale.set(frame.width, 2.3, 1);
              resident.sprite.visible = true;
            }
          }
        });
    });
  }
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
        // Seated sprites intentionally overlap furniture. Only recover walking/standing residents.
        if (
          (!resident.seat || resident.route.length) &&
          time >= resident.nextRecovery &&
          !options.clear(resident.group.position, context.night)
        ) {
          resident.nextRecovery = time + 1000;
          const safe = residentSafePosition(
            resident.group.position,
            (point) => options.clear(point, context.night),
            options.cross,
          );
          if (safe) {
            resident.group.position.x = safe.x;
            resident.group.position.z = safe.z;
            resident.route = [];
            resident.seat = undefined;
            resident.stage = undefined;
            resident.until = 0;
            resident.nextPlan = 0;
          }
        }
        if (!resident.route.length && time > resident.until && time > resident.nextPlan)
          plan(resident, time, context);
        let next: GroundPoint | undefined = resident.route[0];
        if (
          next &&
          (!options.clear(next, context.night) || !options.cross(resident.group.position, next))
        ) {
          resident.route = [];
          resident.seat = undefined;
          resident.stage = undefined;
          resident.until = 0;
          resident.nextPlan = time + 250;
          next = undefined;
        }
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
      resident.cup.visible = drinking && resident.sprite.visible;
      const dx = resident.group.position.x - resident.lastX;
      const dz = resident.group.position.z - resident.lastZ;
      const facing = residentFacing(dx, dz, {
        side: resident.facingSide,
        back: resident.facingBack,
      });
      resident.facingSide = facing.side;
      resident.facingBack = facing.back;
      if (watching) {
        resident.facingBack = true;
        resident.facingSide = 0;
      }
      if (seated) {
        const direction = residentSeatFacing(resident.seat!.facing);
        resident.facingBack = direction.back;
        resident.facingSide = direction.side;
      }
      resident.lastZ = resident.group.position.z;
      const talking = context.talkingResidentId === resident.definition.id;
      if (!seated && (drinking || talking)) {
        resident.facingSide = 0;
        resident.facingBack = false;
        resident.sprite.scale.x = resident.baseWidth;
      }
      if (!context.paused && !reduced) resident.animationTime += dt * 1000;
      const walking = moving && !context.paused;
      const drinkingPose =
        drinking && !seated ? residentDrinkPose(resident.animationTime, reduced) : undefined;
      const drinkFrame = drinkingPose ? resident.poses[drinkingPose] : undefined;
      const pose = residentPose(
        resident.animationTime,
        walking,
        seated,
        talking || resident.activity === 'chat',
        !resident.facingBack && !resident.facingSide,
        reduced,
        !!resident.facingSide,
      );
      const gaitDirection = resident.facingSide ? 1 : resident.facingBack ? 2 : 0;
      const gaitIndex =
        Math.floor(resident.animationTime / (RESIDENT_WALK_PERIOD / RESIDENT_WALK_FRAMES)) %
        RESIDENT_WALK_FRAMES;
      const frame =
        drinkFrame ??
        (walking && !reduced
          ? resident.gait[gaitDirection]?.[gaitIndex]
          : pose
            ? resident.poses[pose]
            : undefined);
      resident.cup.visible =
        drinking && resident.sprite.visible && !drinkFrame && !resident.facingBack;
      const texture =
        frame?.texture ??
        (resident.facingSide && resident.sideTexture
          ? resident.sideTexture
          : resident.facingBack
            ? resident.backTexture
            : resident.standingTexture) ??
        resident.standingTexture;
      const width = frame?.width ?? (resident.facingSide ? resident.sideWidth : resident.baseWidth);
      resident.sprite.scale.set(width, frame?.height ?? 2.3, 1);
      resident.sprite.material.map = texture ?? null;
      if (texture) faceResidentTexture(texture, resident.facingSide < 0);
      resident.lastX = resident.group.position.x;
      resident.sprite.center.y = seated ? 0.23 : 0;
      resident.sprite.position.y = seated
        ? resident.seat!.bar
          ? 1.03
          : 0.705
        : !reduced && walking
          ? Math.abs(Math.sin((resident.animationTime / RESIDENT_WALK_PERIOD) * Math.PI * 2)) *
            0.065
          : 0;
      resident.sprite.material.rotation = reduced
        ? 0
        : walking
          ? Math.sin((resident.animationTime / RESIDENT_WALK_PERIOD) * Math.PI * 2) * 0.035
          : drinkingPose === 'drinkSip' && drinkFrame
            ? Math.sin((((resident.animationTime % 5200) - 2200) / 1600) * Math.PI) * 0.025
            : watching
              ? Math.sin(time / 230) * 0.055
              : 0;
      // The character is a camera-facing sprite: anchor the cup in that same
      // plane at its hand, including the seated pivot, instead of world axes.
      const cupX =
        (seated ? width * 0.19 : resident.baseWidth * 0.32) * (resident.facingSide < 0 ? -1 : 1);
      const cupY = ((seated ? 0.39 : 0.28) - resident.sprite.center.y) * resident.sprite.scale.y;
      const angle = resident.sprite.material.rotation;
      camera.getWorldQuaternion(resident.cup.quaternion);
      resident.cup.position
        .set(
          cupX * Math.cos(angle) - cupY * Math.sin(angle),
          cupX * Math.sin(angle) + cupY * Math.cos(angle),
          0.08,
        )
        .applyQuaternion(resident.cup.quaternion)
        .add(resident.sprite.position);
      resident.cup.rotateZ(angle);
      resident.group.position.y = options.surface(resident.group.position);
      resident.sprite.material.color.set(context.night ? '#cbd1e6' : '#ffffff');
      if (!context.paused && !moving && time > resident.nextReaction) {
        const friend = residents.find(
          (other) =>
            other !== resident &&
            !other.route.length &&
            other.group.position.distanceTo(resident.group.position) < 2.2,
        );
        resident.reactionText = watching
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
        const reactionArt: Record<string, string> = {
          '♥': '/icons/heart.png',
          '♪': '/icons/music.png',
          '짝짝!': '/icons/clap.png',
        };
        const icon = reactionArt[resident.reactionText];
        resident.reactionIcon.hidden = !icon;
        if (icon) resident.reactionIcon.src = icon;
        resident.reactionLabel.textContent = icon ? '' : resident.reactionText;
        resident.reactionLabel.hidden = !!icon;
        resident.reactionUntil = time + 2200;
        resident.nextReaction = time + 7000 + Math.random() * 7000;
      }
      const projected = spriteHeadAnchor(resident.sprite, camera);
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
        y = (-projected.y * 0.5 + 0.5) * canvas.clientHeight - 16;
      const reacting = visible && time < resident.reactionUntil && !!resident.reactionText;
      const nearby = context.people[0] && resident.group.position.distanceTo(context.people[0]) < 3;
      resident.button.hidden = !(visible && nearby && !reacting);
      resident.button.style.display = visible && nearby && !reacting ? 'flex' : 'none';
      resident.button.style.left = `${x}px`;
      resident.button.style.top = `${y}px`;
      resident.reaction.style.display = reacting ? 'flex' : 'none';
      resident.reaction.style.transform = `translate(${x}px, ${y + 10}px) translate(-50%, -100%)`;
    }
  }
  return {
    update,
    positionOf(id: string) {
      return residents.find((resident) => resident.definition.id === id)?.group.position;
    },
    occupiedSeats() {
      return residents
        .filter((resident) => resident.seat && !resident.route.length)
        .map((resident) => resident.seat!.point);
    },
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
