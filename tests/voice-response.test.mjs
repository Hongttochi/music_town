import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const context = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(
    readFileSync(new URL('../src/services/voiceResponse.ts', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText,
  context,
);
const { readVoiceToken } = context.exports;
const valid = {
  url: 'wss://voice.example.test',
  token: 'signed-token',
  performerId: 'performer',
  expiresAt: Date.now() + 60000,
  canPublish: true,
};

test('empty, truncated and HTML responses show a usable error instead of JSON parser text', async () => {
  for (const body of ['', '{"token":', '<html>Bad gateway</html>']) {
    await assert.rejects(
      readVoiceToken(new Response(body, { status: 502 })),
      /음성 서버가 응답하지/,
    );
    await assert.rejects(readVoiceToken(new Response(body)), /올바른 연결 정보/);
  }
  await assert.rejects(
    readVoiceToken(new Response(null, { status: 404 })),
    /서버 실행 또는 배포 설정/,
  );
  await assert.rejects(readVoiceToken(new Response(null, { status: 204 })), /올바른 연결 정보/);
});

test('valid API error messages survive, invalid successful payloads cannot connect', async () => {
  await assert.rejects(
    readVoiceToken(Response.json({ error: '마이크 서버 설정이 필요해요.' }, { status: 503 })),
    /마이크 서버 설정이 필요해요/,
  );
  for (const body of [
    null,
    {},
    { ...valid, token: '' },
    { ...valid, canPublish: 'true' },
    { ...valid, expiresAt: null },
  ]) {
    await assert.rejects(readVoiceToken(Response.json(body)), /올바른 연결 정보/);
  }
  const token = await readVoiceToken(Response.json(valid));
  assert.equal(token.token, valid.token);
  assert.equal(token.canPublish, true);
});
