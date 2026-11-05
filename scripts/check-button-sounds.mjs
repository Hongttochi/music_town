import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
const effects = [],
  handlers = new Map(),
  played = [];
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
    return { gain: {}, connect() {}, disconnect() {} };
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
const code = ts.transpileModule(fs.readFileSync('src/useSoundEffects.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const scope = {
  exports: {},
  Element,
  HTMLDialogElement,
  AudioContext,
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
          createElement() {},
          useRef: (value) => ({ current: value }),
          useCallback: (fn) => fn,
          useEffect: (fn) => effects.push(fn),
        }
      : { default: name },
};
vm.runInNewContext(code, scope);
scope.exports.SoundEffectsProvider({ children: null });
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
cleanup.forEach((fn) => fn());
assert.equal(handlers.size, 0);
console.log(
  'Passed: default buttons, bench, modal confirmation/submit, cancel/close, disabled buttons, Escape, listener cleanup',
);
