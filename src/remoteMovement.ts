/** Match the local walk speed (105 map units per second / 25 world scale).
 * Sparse heartbeat positions must take a whole walking interval to traverse,
 * rather than being consumed in a short exponential burst.
 */
export function remoteMovementStep(distance: number, seconds: number, relocate = false) {
  // Large server relocations must not send an avatar walking across the map.
  if (relocate || distance > 16) return { fraction: 1, walking: false };
  if (distance <= 0.001) return { fraction: 1, walking: false };
  const step = Math.min(distance, 4.2 * Math.max(0, Math.min(seconds, 0.04)));
  return { fraction: step / distance, walking: step > 0 };
}
