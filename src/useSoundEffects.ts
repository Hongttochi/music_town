import { useCallback, useEffect, useRef } from 'react';
import clap from './sounds/clap.mp3';
import complete from './sounds/complete.mp3';
import heart from './sounds/heart.mp3';
import lightstick from './sounds/Lightstick.mp3';

const sources = { clap, complete, heart, lightstick };
export type SoundEffect = keyof typeof sources;

export function useSoundEffects() {
  const engine = useRef<{
    context: AudioContext;
    buffers: Map<SoundEffect, Promise<AudioBuffer>>;
    active: Map<SoundEffect, AudioBufferSourceNode>;
  } | null>(null);

  const prepare = useCallback(() => {
    if (!engine.current) {
      const context = new AudioContext();
      engine.current = { context, buffers: new Map(), active: new Map() };
    }
    const audio = engine.current;
    // Resume within the tap/key event so mobile browsers permit later completion sounds.
    if (audio.context.state === 'suspended') void audio.context.resume().catch(() => {});
    for (const name of Object.keys(sources) as SoundEffect[]) {
      if (audio.buffers.has(name)) continue;
      const buffer = fetch(sources[name])
        .then((response) => {
          if (!response.ok) throw new Error('Sound could not be loaded');
          return response.arrayBuffer();
        })
        .then((bytes) => audio.context.decodeAudioData(bytes));
      audio.buffers.set(name, buffer);
      void buffer.catch(() => audio.buffers.delete(name));
    }
    return audio;
  }, []);

  useEffect(() => {
    const unlock = () => {
      try {
        prepare();
      } catch {
        // Sound support must never block park controls.
      }
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      const audio = engine.current;
      engine.current = null;
      if (audio) void audio.context.close().catch(() => {});
    };
  }, [prepare]);

  return useCallback(
    (name: SoundEffect) => {
      try {
        const audio = prepare();
        void audio.buffers
          .get(name)!
          .then((buffer) => {
            if (engine.current !== audio || audio.context.state !== 'running' || document.hidden)
              return;
            // Repeated taps restart the same effect instead of stacking loud copies.
            audio.active.get(name)?.stop();
            const source = audio.context.createBufferSource();
            const gain = audio.context.createGain();
            gain.gain.value = 0.55;
            source.buffer = buffer;
            source.connect(gain).connect(audio.context.destination);
            audio.active.set(name, source);
            source.onended = () => {
              if (audio.active.get(name) === source) audio.active.delete(name);
              source.disconnect();
              gain.disconnect();
            };
            source.start();
          })
          .catch(() => {});
      } catch {
        // An unavailable audio device should not interrupt the action.
      }
    },
    [prepare],
  );
}
