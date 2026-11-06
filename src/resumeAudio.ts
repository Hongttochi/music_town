/** Safari also exposes `interrupted` after switching apps or locking the screen. */
export function resumeAudio(context: AudioContext): Promise<void> {
  if (context.state === 'running' || context.state === 'closed') return Promise.resolve();
  return context.resume().catch(() => {
    // Autoplay may require another gesture; callers retry on the next tap.
  });
}
