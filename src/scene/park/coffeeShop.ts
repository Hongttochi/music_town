import { findCoffee, type CoffeeId } from '../../data/coffeeMenu';
import * as T from 'three';

const COFFEE_SHOP_OFFSET = new T.Vector3(-1, 0, -6);
export const COFFEE_BUILDING = new T.Vector3(-5, 0, -8).add(COFFEE_SHOP_OFFSET);
export const COFFEE_SPOT = new T.Vector3(-2.3, 0, -4.5).add(COFFEE_SHOP_OFFSET);
/** Small walk-up café; the machine faces the open central path. */
export function createCoffeeShop(scene: T.Scene) {
  const group = new T.Group();
  group.name = 'coffee-shop';
  group.position.copy(COFFEE_SHOP_OFFSET);
  scene.add(group);
  const materials: T.Material[] = [];
  function block(x: number, y: number, z: number, w: number, h: number, d: number, color: string) {
    const material = new T.MeshStandardMaterial({ color, roughness: 0.75 });
    materials.push(material);
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  block(-5, 1.5, -8, 4, 3, 3, '#f1d4a7');
  block(-5, 3.1, -8, 4.5, 0.35, 3.5, '#8a513f');
  block(-5.7, 1.65, -6.46, 1.9, 1.4, 0.1, '#436864');
  block(-3.8, 1.1, -6.45, 1, 2.2, 0.15, '#956a48');
  for (let i = 0; i < 8; i++)
    block(-6.75 + i * 0.5, 2.7, -6.15, 0.5, 0.18, 1.15, i % 2 ? '#fff0d3' : '#6e8b66');
  const label = document.createElement('canvas');
  label.width = 512;
  label.height = 128;
  const ctx = label.getContext('2d')!;
  ctx.fillStyle = '#fff0d3';
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = '#594631';
  ctx.font = 'bold 60px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PARK COFFEE', 256, 85);
  const texture = new T.CanvasTexture(label);
  texture.colorSpace = T.SRGBColorSpace;
  const signMaterial = new T.MeshBasicMaterial({ map: texture });
  materials.push(signMaterial);
  const sign = new T.Mesh(new T.PlaneGeometry(3.5, 0.8), signMaterial);
  sign.position.set(-5, 3.15, -6.2);
  group.add(sign);
  const x = COFFEE_SPOT.x - COFFEE_SHOP_OFFSET.x,
    z = COFFEE_SPOT.z - COFFEE_SHOP_OFFSET.z - 1.5;
  block(x, 1.05, z, 1.1, 2.1, 0.85, '#637d60');
  block(x, 1.55, z + 0.44, 0.8, 0.65, 0.05, '#efce88');
  block(x, 0.7, z + 0.45, 0.75, 0.65, 0.06, '#343f37');
  block(x, 0.4, z + 0.7, 0.85, 0.1, 0.6, '#b99a70');
  block(x, 1, z + 0.63, 0.12, 0.2, 0.16, '#d1b88c');
  const cup = block(x, 0.58, z + 0.65, 0.28, 0.32, 0.28, '#fff1d6');
  const stream = block(x, 0.85, z + 0.65, 0.04, 0.25, 0.04, '#71482b');
  cup.visible = stream.visible = false;
  return {
    update(phase: string, progress: number, drink: CoffeeId) {
      stream.material.color.set(findCoffee(drink).color);
      cup.material.color.set(findCoffee(drink).iced ? '#cda882' : '#fff1d6');
      cup.visible = phase === 'brewing' || phase === 'ready';
      stream.visible = phase === 'brewing' && progress > 0.2;
      cup.position.y = 0.58 + (phase === 'brewing' ? Math.max(0, 0.2 - progress) : 0);
    },
    dispose() {
      texture.dispose();
      materials.forEach((m) => m.dispose());
    },
  };
}
