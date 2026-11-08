import { BRIDGE } from './riverBoundary';
import { COFFEE_SPOT } from './coffeeShop';
export const PARK_PATHS: { points: [number, number][]; width: number }[] = [
  {
    points: [
      [-14, 4],
      [-14, -8],
      [0, -10.5],
      [10, -7],
      [12, 1],
      [12, 8],
      [2, 11],
      [-10, 10],
      [-14, 4],
    ],
    width: 1,
  },
  {
    points: [
      [0, -10.5],
      [0, -3],
      [0, 3],
      [7, 4.5],
      [15, BRIDGE.centerZ],
    ],
    width: 1,
  },
  {
    points: [
      [0, -10.5],
      [COFFEE_SPOT.x, COFFEE_SPOT.z],
    ],
    width: 0.65,
  },
  {
    points: [
      [24.5, BRIDGE.centerZ],
      [29, BRIDGE.centerZ],
    ],
    width: 1,
  },
  {
    points: [
      [29, 4.5],
      [28, -6],
      [34, -8],
      [36, 0],
      [35, 10],
      [29, 10],
      [29, 4.5],
    ],
    width: 0.9,
  },
  {
    points: [
      [29, 4.5],
      [28, -1],
      [32, -2.8],
    ],
    width: 0.75,
  },
];
