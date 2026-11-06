import vm from 'node:vm';
import { build } from 'esbuild';
import { basename } from 'node:path';
import assert from 'node:assert/strict';
const effects = [],
  handlers = new Map(),
  played = [],
  gains = [],
  providers = [],
  preferences = new Map();
class Element {
  constructor(label, { modal = false, disabled = false, type, aria } = {}) {
    this.textContent = label;
    this.modal = modal;
    this.disabled = disabled;
    this.attributes = { type, 'aria-label': aria };
  }
  closest(selector) {
    return selector.startsWith('button') ? this : this.modal ? {} : null;
  }
  matches() {
    return this.disabled;
  }
  getAttribute(name) {
    return this.attributes[name] ?? null;
  }
}
class HTMLDialogElement extends Element {}
class AudioContext {
  state = 'running';
  destination = {};
  resume() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
  decodeAudioData(bytes) {
    return Promise.resolve(bytes);
  }
  createGain() {
    const node = { gain: {}, connect() {}, disconnect() {} };
    gains.push(node);
    return node;
  }
  createBufferSource() {
    return {
      connect(gain) {
        return gain;
      },
      disconnect() {},
      start() {
        played.push(this.buffer);
      },
      stop() {
        this.onended?.();
      },
    };
  }
}
const bundled = await build({
  entryPoints: ['src/providers/SoundEffectsProvider.tsx'],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node',
  external: ['react'],
  plugins: [
    {
      name: 'mock-sound-urls',
      setup(build) {
        build.onLoad({ filter: /\.mp3$/ }, (args) => ({
          contents: `export default ${JSON.stringify('./sounds/' + basename(args.path))}`,
          loader: 'js',
        }));
      },
    },
  ],
});
const code = bundled.outputFiles[0].text;
const output = {};
const scope = {
  exports: output,
  module: { exports: output },
  Element,
  HTMLDialogElement,
  AudioContext,
  localStorage: {
    getItem: (key) => preferences.get(key),
    setItem: (key, value) => preferences.set(key, value),
  },
  document: {
    hidden: false,
    addEventListener: (name, fn) => handlers.set(name, fn),
    removeEventListener: (name) => handlers.delete(name),
  },
  window: { addEventListener() {}, removeEventListener() {} },
  fetch: async (url) => ({ ok: true, arrayBuffer: async () => url }),
  require: (name) =>
    name === 'react'
      ? {
          createContext: () => ({ Provider: {} }),
          createElement(_type, props) {
            providers.push(props.value);
          },
          useState: (initial) => [initial(), () => {}],
          useRef: (value) => ({ current: value }),
          useCallback: (fn) => fn,
          useEffect: (fn) => effects.push(fn),
        }
      : { default: name },
};
vm.runInNewContext(code, scope);
scope.module.exports.SoundEffectsProvider({ children: null });
const cleanup = effects.map((fn) => fn());
async function check(label, options, expected) {
  const before = played.length;
  handlers.get('click')({ target: new Element(label, options) });
  await new Promise(setImmediate);
  assert.equal(played.length, before + (expected ? 1 : 0), label);
  if (expected) assert.equal(played.at(-1), `./sounds/${expected}.mp3`, label);
}
await check('로그인', {}, 'click');
await check('의자에 앉기', {}, 'click');
await check('확인', { modal: true }, 'ok');
await check('공원으로 가기', { modal: true, type: 'submit' }, 'ok');
await check('취소', { modal: true }, 'cancel');
await check('', { modal: true, aria: '닫기' }, 'cancel');
await check('확인', { modal: true, disabled: true }, null);
handlers.get('cancel')({ target: new HTMLDialogElement('') });
await new Promise(setImmediate);
assert.equal(played.at(-1), './sounds/cancel.mp3');
const settings = providers.find((value) => typeof value === 'object' && 'setEnabled' in value);
const play = providers.find((value) => typeof value === 'function');
play('clap');
settings.setEnabled(false);
const beforeMuted = played.length;
await new Promise(setImmediate);
assert.equal(played.length, beforeMuted, 'pending effect is cancelled when muted');
await check('확인', { modal: true }, null);
play('complete');
await new Promise(setImmediate);
assert.equal(played.length, beforeMuted, 'completion is muted too');
assert.equal(preferences.get('music-town-sound-effects'), 'off');
settings.setEnabled(true);
await check('일반 버튼', {}, 'click');
assert.equal(preferences.get('music-town-sound-effects'), 'on');
settings.setVolume(0.35);
assert.equal(gains[0].gain.value, 0.35, 'master gain changes immediately');
assert.equal(preferences.get('music-town-sound-volume'), '0.35');
settings.setVolume(0);
await check('일반 버튼', {}, null);
settings.setVolume(1);
await check('일반 버튼', {}, 'click');
assert.equal(gains[0].gain.value, 1);
cleanup.forEach((fn) => fn());
assert.equal(handlers.size, 0);
console.log(
  'Passed: default buttons, bench, modal confirmation/submit, cancel/close, disabled buttons, Escape, listener cleanup',
);
