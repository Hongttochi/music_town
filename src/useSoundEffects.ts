import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import clap from './sounds/clap.mp3';
import complete from './sounds/complete.mp3';
import heart from './sounds/heart.mp3';
import lightstick from './sounds/Lightstick.mp3';
import click from './sounds/click.mp3';
import ok from './sounds/ok.mp3';
import cancel from './sounds/cancel.mp3';

const sources = { clap, complete, heart, lightstick, click, ok, cancel };
export type SoundEffect = keyof typeof sources;

const SoundContext = createContext<(name: SoundEffect) => void>(() => {});
export function useSoundEffects() {
  return useContext(SoundContext);
}

export function SoundEffectsProvider({ children }: { children: ReactNode }) {
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

  const play = useCallback(
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
  useEffect(() => {
    const clickButton = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest(
        'button, [role="button"], input[type="submit"], input[type="button"]',
      );
      if (!button || button.matches(':disabled, [aria-disabled="true"]')) return;
      const explicit = button.getAttribute('data-sound');
      const label = (
        button.getAttribute('aria-label') ||
        button.textContent ||
        button.getAttribute('value') ||
        ''
      ).trim();
      const inModal = Boolean(button.closest('dialog, [role="dialog"], [role="alertdialog"]'));
      if (explicit === 'cancel' || /취소|닫기|^x$/i.test(label)) play('cancel');
      else if (
        explicit === 'ok' ||
        (inModal && (button.getAttribute('type') === 'submit' || /확인|완료|저장|적용/.test(label)))
      )
        play('ok');
      else play('click');
    };
    const cancelDialog = (event: Event) => {
      if (event.target instanceof HTMLDialogElement) play('cancel');
    };
    // Capture before the action closes a dialog or removes its button.
    document.addEventListener('click', clickButton, true);
    document.addEventListener('cancel', cancelDialog, true);
    return () => {
      document.removeEventListener('click', clickButton, true);
      document.removeEventListener('cancel', cancelDialog, true);
    };
  }, [play]);
  return createElement(SoundContext.Provider, { value: play }, children);
}
