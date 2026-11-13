import { createVoiceHandler } from '../api/voice-token.mjs';

/** Adapt the existing server handler to Vite's Node middleware, server side only. */
export function createVoiceMiddleware(env) {
  const handler = createVoiceHandler(env);
  return (req, res, next) => {
    if (new URL(req.url || '/', 'http://localhost').pathname !== '/api/voice-token') {
      next();
      return;
    }
    res.status = (status) => {
      res.statusCode = status;
      return res;
    };
    res.json = (body) => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(body));
    };
    void (async () => {
      if (req.method !== 'POST') return handler(req, res);
      const chunks = [];
      let length = 0;
      for await (const chunk of req) {
        length += chunk.length;
        if (length > 16384) {
          res.status(413).json({ error: '요청 내용이 너무 커요.' });
          return;
        }
        chunks.push(chunk);
      }
      req.body = Buffer.concat(chunks).toString('utf8');
      await handler(req, res);
    })().catch(() => {
      if (!res.writableEnded)
        res.status(500).json({ error: '음성 연결 서버에서 오류가 발생했어요.' });
    });
  };
}
