import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const context = {
  exports: {},
  require(name) {
    if (name === 'react') {
      return {
        useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
        useRef: (initial) => ({ current: initial }),
        useEffect: () => {},
      };
    }
    throw new Error(`Unexpected import: ${name}`);
  },
};

vm.runInNewContext(
  ts.transpileModule(
    readFileSync(new URL('../src/hooks/usePerformanceRecorder.ts', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText,
  context,
);

const { selectRecordingFormat, buildRecordingFilename, formatRecordingDuration } = context.exports;

test('selectRecordingFormat prefers supported audio format and falls back cleanly', () => {
  const mp4 = selectRecordingFormat((mime) => mime === 'audio/mp4');
  assert.equal(mp4.mimeType, 'audio/mp4');
  assert.equal(mp4.ext, 'm4a');

  const opus = selectRecordingFormat((mime) => mime === 'audio/webm;codecs=opus');
  assert.equal(opus.mimeType, 'audio/webm;codecs=opus');
  assert.equal(opus.ext, 'webm');

  const fallback = selectRecordingFormat(() => false);
  assert.equal(fallback.mimeType, '');
  assert.equal(fallback.ext, 'webm');
});

test('buildRecordingFilename formats timestamp and extension', () => {
  const filename = buildRecordingFilename('m4a', new Date(2026, 10, 14, 9, 5, 3));
  assert.equal(filename, 'music-town-busking-20261114-090503.m4a');
});

test('formatRecordingDuration renders zero-padded mm:ss', () => {
  assert.equal(formatRecordingDuration(0), '00:00');
  assert.equal(formatRecordingDuration(9), '00:09');
  assert.equal(formatRecordingDuration(75), '01:15');
});
