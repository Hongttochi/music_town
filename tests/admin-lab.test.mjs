import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const compiled = await build({
  stdin: {
    contents: `import React from 'react';
      import {renderToStaticMarkup} from 'react-dom/server';
      import {AdminLab} from './src/components/settings/AdminLab';
      export function lab(time, season) {
        return renderToStaticMarkup(<AdminLab time={time} season={season} onTime={()=>{}} onSeason={()=>{}} onReset={()=>{}} />);
      }`,
    resolveDir: process.cwd(),
    loader: 'tsx',
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
  loader: { '.css': 'empty' },
});
const mod = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(
  require,
  mod,
  mod.exports,
);
const { lab } = mod.exports;

test('lab identifies selected options and allows returning from a preview', () => {
  const preview = lab('night', 'winter');
  assert.match(preview, /aria-label="밤" aria-pressed="true"/);
  assert.match(preview, /aria-label="겨울" aria-pressed="true"/);
  assert.doesNotMatch(preview, /disabled/);
  const automatic = lab('auto', 'auto');
  assert.match(automatic, /disabled=""/);
  assert.match(automatic, /다른 이용자에게는 적용되지/);
});
