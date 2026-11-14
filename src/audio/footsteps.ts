export type FootstepSound = 'grassWalk' | 'barWalk';

/** Own one walking recording, switching it only when movement or flooring changes. */
export function createFootsteps(play: (sound: FootstepSound, loop: boolean) => () => void) {
  let current: FootstepSound | null = null;
  let cancel: (() => void) | undefined;
  const stop = () => {
    cancel?.();
    cancel = undefined;
    current = null;
  };
  return {
    update(moving: boolean, insideBar: boolean) {
      const next = moving ? (insideBar ? 'barWalk' : 'grassWalk') : null;
      if (next === current) return;
      stop();
      if (next) {
        current = next;
        cancel = play(next, true);
      }
    },
    stop,
  };
}
