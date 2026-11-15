/** Distance-based walking gait shared by local and remote characters.
 *
 * Kept free of three.js and DOM imports so node:test can load it directly.
 */

/** World units covered by one full eight-frame cycle. */
export const GAIT_STRIDE = 1.9;
/** World units per second at full input. Matches 105 map px/s with the 25 px world scale. */
export const WALK_SPEED = 4.2;
export const GAIT_FRAMES = 8;
export const GAIT_BOB_AMPLITUDE = 0.055;
export const GAIT_TILT_AMPLITUDE = 0.012;
export const JOYSTICK_DEADZONE = 0.12;

const FULL_CIRCLE = Math.PI * 2;
const STEP = Math.PI / 4;
const BOB_EASE_TAU = 0.12;
const GAIT_CADENCE = WALK_SPEED / GAIT_STRIDE;
const ACCEL_TAU = 0.07;
const DECEL_TAU = 0.05;
const STOP_SPEED = 0.05;
const FACING_HYSTERESIS = (10 * Math.PI) / 180;
const FACING_CENTERS = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

export type GaitState = {
  phase: number;
  settling: boolean;
  bobWeight: number;
};

export type Velocity = { x: number; z: number };

const wrapPhase = (phase: number) => ((phase % 1) + 1) % 1;

const angleDistance = (a: number, b: number) =>
  Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

export function createGaitState(phase = 0): GaitState {
  return { phase: wrapPhase(phase), settling: false, bobWeight: 0 };
}

/**
 * Advance the gait by the distance actually covered this frame.
 * Obstacles therefore freeze the legs instead of making them run in place.
 */
export function advanceGait(
  state: GaitState,
  distanceMoved: number,
  dt: number,
  moving: boolean,
): GaitState {
  const seconds = Math.max(0, dt);
  let phase = wrapPhase(state.phase || 0);
  let settling = state.settling === true;
  const previousWeight = Number.isFinite(state.bobWeight) ? state.bobWeight : 0;
  if (moving) {
    settling = false;
    phase = wrapPhase(phase + Math.max(0, distanceMoved) / GAIT_STRIDE);
  } else {
    const frame = gaitFrame(phase);
    if (frame === 0 || frame === 4) {
      // Already showing legs together: finish without rewinding the walk.
      phase = frame === 0 ? 0 : 0.5;
      settling = false;
    } else if (!settling) settling = true;
  }
  if (settling && !moving) {
    // Only continue forward to the next legs-together frame, never backwards.
    const target = phase < 0.5 ? 0.5 : 1;
    const next = Math.min(target, phase + GAIT_CADENCE * seconds);
    if (next >= target) {
      phase = target === 1 ? 0 : target;
      settling = false;
    } else phase = next;
  }
  const targetWeight = moving && distanceMoved > 0 ? 1 : 0;
  const blend = 1 - Math.exp(-seconds / BOB_EASE_TAU);
  const bobWeight = previousWeight + (targetWeight - previousWeight) * blend;
  return { phase: wrapPhase(phase), settling, bobWeight };
}

export function gaitFrame(phase: number) {
  return Math.floor(wrapPhase(phase) * GAIT_FRAMES) % GAIT_FRAMES;
}

/** One bob per step, highest when the legs pass together (frames 0 and 4). */
export function gaitBob(phase: number, weight: number) {
  return Math.abs(Math.cos(wrapPhase(phase) * FULL_CIRCLE)) * GAIT_BOB_AMPLITUDE * weight;
}

export function gaitTilt(phase: number, weight: number) {
  return Math.sin(wrapPhase(phase) * FULL_CIRCLE) * GAIT_TILT_AMPLITUDE * weight;
}

const rawFacingCell = (angle: number) =>
  Math.abs(angle) < STEP ? 0 : Math.abs(angle) > Math.PI * 0.75 ? 2 : angle > 0 ? 1 : 3;

/** Four-direction sprite cell with a 10° hysteresis band around each boundary. */
export function facingCell(angle: number, previousCell?: number | null) {
  const normalized = Math.atan2(Math.sin(angle), Math.cos(angle));
  const raw = rawFacingCell(normalized);
  if (previousCell === undefined || previousCell === null) return raw;
  const center = FACING_CENTERS[previousCell];
  if (angleDistance(normalized, center) <= STEP + FACING_HYSTERESIS) {
    // Keyboard diagonals land exactly on a boundary. Prefer the raw cell there so
    // the eight directions stay stable and distinct instead of sticking to the
    // previous facing forever.
    const onBoundary =
      Math.abs(Math.abs(normalized) - STEP) < 1e-9 ||
      Math.abs(Math.abs(normalized) - Math.PI * 0.75) < 1e-9;
    if (!onBoundary) return previousCell;
  }
  return raw;
}

/** Circular clamp and radial deadzone remap for the touch joystick. */
export function joystickVector(dx: number, dy: number, radius: number) {
  const length = Math.hypot(dx, dy);
  if (length === 0 || radius <= 0) return { x: 0, y: 0 };
  const magnitude = Math.min(1, length / radius);
  if (magnitude <= JOYSTICK_DEADZONE + 1e-9) return { x: 0, y: 0 };
  const strength = (magnitude - JOYSTICK_DEADZONE) / (1 - JOYSTICK_DEADZONE);
  return { x: (dx / length) * strength, y: (dy / length) * strength };
}

const smoothingTau = (current: Velocity, target: Velocity) =>
  Math.hypot(target.x, target.z) >= Math.hypot(current.x, current.z) ? ACCEL_TAU : DECEL_TAU;

/** Frame-rate independent exponential approach with no overshoot. */
export function smoothVelocity(current: Velocity, target: Velocity, dt: number): Velocity {
  const seconds = Math.max(0, dt);
  const blend = 1 - Math.exp(-seconds / smoothingTau(current, target));
  const x = current.x + (target.x - current.x) * blend;
  const z = current.z + (target.z - current.z) * blend;
  if (Math.hypot(x, z) < STOP_SPEED) return { x: 0, z: 0 };
  return { x, z };
}

/** Exact displacement for one smoothVelocity step, independent of frame rate. */
export function smoothVelocityDelta(current: Velocity, target: Velocity, dt: number) {
  const seconds = Math.max(0, dt);
  const tau = smoothingTau(current, target);
  const blend = 1 - Math.exp(-seconds / tau);
  const next = {
    x: current.x + (target.x - current.x) * blend,
    z: current.z + (target.z - current.z) * blend,
  };
  if (seconds === 0) return { x: 0, z: 0 };
  return {
    x: target.x * seconds + (current.x - next.x) * tau,
    z: target.z * seconds + (current.z - next.z) * tau,
  };
}
