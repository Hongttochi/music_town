import * as T from 'three';
import { residentFrameCanvas } from './residentFrames';

export type ResidentFrame = { texture: T.Texture; width: number; height: number };
export type ResidentPose =
  | 'walkA'
  | 'walkB'
  | 'frontWalkA'
  | 'frontWalkB'
  | 'backWalkA'
  | 'backWalkB'
  | 'drinkHold'
  | 'drinkSip'
  | 'sitBack'
  | 'sitSide'
  | 'sit'
  | 'happy'
  | 'blink';

export function residentPose(
  time: number,
  moving: boolean,
  seated: boolean,
  happy: boolean,
  front: boolean,
  reduced: boolean,
  side = true,
): ResidentPose | null {
  if (seated) return side ? 'sitSide' : front ? 'sit' : 'sitBack';
  if (moving) {
    if (reduced) return null;
    const stepA = Math.floor(time / 180) % 2 === 0;
    if (side) return stepA ? 'walkA' : 'walkB';
    return front ? (stepA ? 'frontWalkA' : 'frontWalkB') : stepA ? 'backWalkA' : 'backWalkB';
  }
  if (!front) return null;
  if (happy) return 'happy';
  return !reduced && time % 4700 < 140 ? 'blink' : null;
}

// Sprite shaders take the length of the model axes, ignoring negative scale.
export function faceResidentTexture(texture: T.Texture, left: boolean) {
  texture.repeat.x = left ? -1 : 1;
  texture.offset.x = left ? 1 : 0;
}

export function residentFrame(
  image: HTMLImageElement,
  column: number,
  row: number,
  rows: number,
  height = 2.3,
): ResidentFrame {
  const cropped = residentFrameCanvas(image, column, rows)[row];
  const texture = new T.CanvasTexture(cropped);
  texture.colorSpace = T.SRGBColorSpace;
  return { texture, width: (height * cropped.width) / cropped.height, height };
}

export function residentDrinkPose(time: number, reduced: boolean): ResidentPose {
  return !reduced && time % 5200 >= 2200 && time % 5200 < 3800 ? 'drinkSip' : 'drinkHold';
}
