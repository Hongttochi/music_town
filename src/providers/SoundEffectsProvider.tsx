import { createElement, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { resumeAudio } from '../utils/resumeAudio';
import { sources, type SoundEffect } from '../data/sounds';
import { SoundContext, SoundSettingsContext } from '../contexts/SoundContext';
const preferenceKey = 'music-town-sound-effects';
const volumeKey = 'music-town-sound-volume';
const ambientVolumeKey = 'music-town-ambient-volume';
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
  const [ambientVolume, updateAmbientVolume] = useState(() => {
    try {
      const saved = localStorage.getItem(ambientVolumeKey);
      const value = saved === null ? (enabled ? volume : 0) : Number(saved);
      return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1;
    } catch {
      return 1;
    }
  });
  const setAmbientVolume = useCallback((value: number) => {
    if (!Number.isFinite(value)) return;
    const next = Math.max(0, Math.min(1, value));
    updateAmbientVolume(next);
    try {
      localStorage.setItem(ambientVolumeKey, String(next));
    } catch {
      /* Storage is optional. */
    }
  }, []);
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
    void resumeAudio(audio.context);
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
    const restore = () => {
      if (!document.hidden && enabledRef.current && engine.current)
        void resumeAudio(engine.current.context);
    };
    document.addEventListener('visibilitychange', restore);
    window.addEventListener('pageshow', restore);
    window.addEventListener('focus', restore);
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      document.removeEventListener('visibilitychange', restore);
      window.removeEventListener('pageshow', restore);
      window.removeEventListener('focus', restore);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      const audio = engine.current;
      engine.current = null;
      if (audio) void audio.context.close().catch(() => {});
    };
  }, [prepare]);

  const play = useCallback(
    (name: SoundEffect, loop = false) => {
      if (!enabledRef.current) return () => {};
      let canceled = false;
      let playing: AudioBufferSourceNode | null = null;
      const version = playbackVersion.current;
      try {
        const audio = prepare();
        void Promise.all([audio.buffers.get(name)!, resumeAudio(audio.context)])
          .then(([buffer]) => {
            if (
              canceled ||
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
            gain.gain.value = name === 'grassWalk' || name === 'barWalk' ? 0.2 : 0.55;
            source.buffer = buffer;
            source.loop = loop;
            playing = source;
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
      return () => {
        canceled = true;
        playing?.stop();
      };
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
      if (explicit === 'none') return;
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
    { value: { enabled, setEnabled, volume, setVolume, ambientVolume, setAmbientVolume } },
    createElement(SoundContext.Provider, { value: play }, children),
  );
}
