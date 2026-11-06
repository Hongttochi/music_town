import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/components/profile/ProfileBio.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
}).outputText;
const context = {
  exports: {},
  URL,
  require: (path) => (path.endsWith('.css') ? {} : require(path)),
};
vm.runInNewContext(compiled, context);
const render = (text) =>
  renderToStaticMarkup(React.createElement(context.exports.ProfileBio, { text }));

test('links explicit web URLs in a new tab and preserves surrounding text', () => {
  const html = render('음악: https://soundcloud.com/artist\n소식 (www.instagram.com/artist).');
  assert.equal((html.match(/<a /g) || []).length, 2);
  assert.match(html, /href="https:\/\/www.instagram.com\/artist"/);
  assert.equal((html.match(/target="_blank" rel="noopener noreferrer"/g) || []).length, 2);
  assert.ok(html.endsWith('</a>).'));
  assert.match(html, /\n소식/);
});
test('keeps executable markup, invalid URLs and credential URLs inert', () => {
  const html = render(
    '<script>alert(1)</script> javascript:alert(1) https:// https://user:secret@example.com mail@www.example.com',
  );
  assert.doesNotMatch(html, /<a |<script>/);
  assert.match(html, /&lt;script&gt;/);
});
test('supports balanced URL parentheses and query strings without HTML injection', () => {
  const html = render('https://example.com/music_(live)?a=1&b=2');
  assert.match(html, /href="https:\/\/example.com\/music_\(live\)\?a=1&amp;b=2"/);
  assert.equal((html.match(/<a /g) || []).length, 1);
});
