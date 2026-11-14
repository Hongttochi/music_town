import * as T from 'three';

/** Sprite vertices face the camera, so world-up does not locate the visible head. */
export function spriteHeadAnchor(sprite: T.Sprite, camera: T.Camera): T.Vector3 {
  sprite.updateWorldMatrix(true, false);
  camera.updateWorldMatrix(true, false);
  const scale = sprite.getWorldScale(new T.Vector3());
  const angle = sprite.material.rotation;
  const height =
    (1 - sprite.center.y) * Math.abs(scale.y) * Math.cos(angle) +
    Math.abs(scale.x * Math.sin(angle)) / 2;
  const up = new T.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  return sprite.getWorldPosition(new T.Vector3()).addScaledVector(up, height);
}
