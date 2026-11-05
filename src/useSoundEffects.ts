import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
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

const preferenceKey = 'music-town-sound-effects';
const volumeKey = 'music-town-sound-volume';
const SoundSettingsContext = createContext({
  enabled: true,
  volume: 1,
  setVolume: (_volume: number) => {},
  setEnabled: (_enabled: boolean) => {},
});
export function useSoundSettings() {
  return useContext(SoundSettingsContext);
}

const SoundContext = createContext<(name: SoundEffect) => void>(() => {});
export function useSoundEffects() {
  return useContext(SoundContext);
}

export function SoundEffectsProvider({ children }: { children: ReactNode }) {
  const [enabled, updateEnabled] = useState(() => {
    try {
      return localStorage.getItem(preferenceKey) !== 'off';
    } catch {
      return true;
    }
  });
  const [volume, updateVolume] = useState(() => {
    try {
      const saved = localStorage.getItem(volumeKey);
      const value = saved === null ? 1 : Number(saved);
      return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1;
    } catch {
      return 1;
    }
  });
  const volumeRef = useRef(volume);
  const enabledRef = useRef(enabled);
  const playbackVersion = useRef(0);
  const engine = useRef<{
    context: AudioContext;
    master: GainNode;
    buffers: Map<SoundEffect, Promise<AudioBuffer>>;
    active: Map<SoundEffect, AudioBufferSourceNode>;
  } | null>(null);

  const setEnabled = useCallback((next: boolean) => {
    enabledRef.current = next;
    playbackVersion.current += 1;
    updateEnabled(next);
    if (!next) {
      engine.current?.active.forEach((source) => source.stop());
      engine.current?.active.clear();
    }
    try {
      localStorage.setItem(preferenceKey, next ? 'on' : 'off');
    } catch {
      /* Keep the switch usable when browser storage is unavailable. */
    }
  }, []);

  const setVolume = useCallback(
    (value: number) => {
      if (!Number.isFinite(value)) return;
      const next = Math.max(0, Math.min(1, value));
      volumeRef.current = next;
      updateVolume(next);
      if (engine.current) engine.current.master.gain.value = next;
      setEnabled(next > 0);
      try {
        localStorage.setItem(volumeKey, String(next));
      } catch {
        /* Storage is optional. */
      }
    },
    [setEnabled],
  );

  const prepare = useCallback(() => {
    if (!engine.current) {
      const context = new AudioContext();
      const master = context.createGain();
      master.gain.value = volumeRef.current;
      master.connect(context.destination);
      engine.current = { context, master, buffers: new Map(), active: new Map() };
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
      if (!enabledRef.current) return;
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
      if (!enabledRef.current) return;
      const version = playbackVersion.current;
      try {
        const audio = prepare();
        void audio.buffers
          .get(name)!
          .then((buffer) => {
            if (
              !enabledRef.current ||
              version !== playbackVersion.current ||
              engine.current !== audio ||
              audio.context.state !== 'running' ||
              document.hidden
            )
              return;
            // Repeated taps restart the same effect instead of stacking loud copies.
            audio.active.get(name)?.stop();
            const source = audio.context.createBufferSource();
            const gain = audio.context.createGain();
            gain.gain.value = 0.55;
            source.buffer = buffer;
            source.connect(gain).connect(audio.master);
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
  return createElement(
    SoundSettingsContext.Provider,
    { value: { enabled, setEnabled, volume, setVolume } },
    createElement(SoundContext.Provider, { value: play }, children),
  );
}
