import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const compiled = await build({
  stdin: {
    contents: `import React from 'react';
      import {renderToStaticMarkup} from 'react-dom/server';
      import {StageProfile} from './src/components/park/StageProfile';
      import {ReportForm} from './src/components/legal/ReportForm';
      export function stage(own) { return renderToStaticMarkup(<StageProfile own={own} selected={{name:'무대',artist:'가수',listeners:0}} muted={false} />); }
      export function report(id) { return renderToStaticMarkup(<ReportForm reporterId="me" target={{id,avatar:{name:'가수'}}} onClose={()=>{}}/>); }`,
    resolveDir: process.cwd(),
    loader: 'tsx',
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
  loader: { '.css': 'empty' },
  define: { 'import.meta.env': '{}' },
});
const mod = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(
  require,
  mod,
  mod.exports,
);
test('own performance hides audience actions while other performances retain them', () => {
  assert.doesNotMatch(mod.exports.stage(true), /무대 앞에서 듣기|음소거|공연 대기|신고/);
  for (const label of ['무대 앞에서 듣기', '음소거', '공연 대기', '신고']) {
    assert.ok(mod.exports.stage(false).includes(label));
  }
});
test('report form cannot submit for the current account', () => {
  assert.doesNotMatch(mod.exports.report('me'), /<form|type="submit"/);
  assert.match(mod.exports.report('other'), /type="submit"/);
});
