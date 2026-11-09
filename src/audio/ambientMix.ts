type AmbientMix = {
  audible: boolean;
  volume: number;
  quiet: boolean;
  night: boolean;
  insideBar: boolean;
  barPerforming: boolean;
  riverMix: number;
  fireProximity: number;
};

export function ambientLevels(s: AmbientMix): number[] {
  if (!s.audible) return [0, 0, 0, 0, 0];
  // Jazz is intentionally much softer than the outdoor ambience.
  if (s.insideBar) return [0, 0, 0, 0, s.night && !s.barPerforming ? s.volume * 0.035 : 0];
  const master = s.volume * (s.quiet ? 0.08 : 0.3);
  return [
    s.night ? 0 : master * (1 - s.riverMix * 0.65),
    s.night ? master * (1 - s.riverMix * 0.65) : 0,
    master * s.riverMix,
    s.night ? master * s.fireProximity * s.fireProximity : 0,
    0,
  ];
}
