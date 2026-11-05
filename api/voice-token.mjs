import { AccessToken, TrackSource } from 'livekit-server-sdk';
import { createHash } from 'node:crypto';

// Only the authenticated town snapshot can select the room and publisher.
export function voiceGrant(snapshot, userId, channel, stage, now = Date.now()) {
  if (
    snapshot?.channel !== channel ||
    !Array.isArray(snapshot.participants) ||
    !snapshot.participants.some((person) => person.id === userId)
  )
    return null;
  const performance = snapshot.performances?.find(
    (item) =>
      item.channel_id === channel && item.stage_id === stage && Date.parse(item.ends_at) > now,
  );
  if (!performance) return null;
  const publisher = snapshot.participants.find((person) => person.id === performance.user_id);
  if (publisher?.role !== 'musician') return null;
  const session = createHash('sha256')
    .update(JSON.stringify([channel, stage, performance.user_id, performance.ends_at]))
    .digest('hex')
    .slice(0, 32);
  return {
    room: `town-performance-${session}`,
    canPublish: performance.user_id === userId,
    performerId: performance.user_id,
    expiresAt: Date.parse(performance.ends_at),
  };
}

export function createVoiceHandler(env = process.env, request = fetch) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    const fail = (status, error) => res.status(status).json({ error });
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return fail(405, 'POST 요청이 필요해요.');
    }
    const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = env;
    const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
    const publicKey = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const missing = Object.entries({
      LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET,
      'SUPABASE_URL 또는 VITE_SUPABASE_URL': supabaseUrl,
      'SUPABASE_PUBLISHABLE_KEY 또는 VITE_SUPABASE_PUBLISHABLE_KEY': publicKey,
    }).filter(([, value]) => typeof value !== 'string' || !value.trim()).map(([name]) => name);
    if (missing.length) {
      return fail(503, `음성 서버 환경 변수 누락: ${missing.join(', ')}`);
    }
    const authorization = req.headers.authorization;
    if (typeof authorization !== 'string' || !/^Bearer \S+$/.test(authorization)) {
      return fail(401, '로그인 후 음성에 연결할 수 있어요.');
    }
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return fail(400, '잘못된 요청이에요.');
    }
    if (
      !body ||
      !Number.isInteger(body.channel) ||
      !Number.isInteger(body.stage) ||
      typeof body.client !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.client)
    ) {
      return fail(400, '채널과 무대를 확인해 주세요.');
    }
    const headers = {
      apikey: publicKey,
      Authorization: authorization,
      'Content-Type': 'application/json',
    };
    try {
      const auth = await request(`${supabaseUrl}/auth/v1/user`, {
        headers,
        signal: AbortSignal.timeout(8000),
      });
      if (!auth.ok) return fail(auth.status >= 500 ? 502 : 401, '로그인 상태를 확인해 주세요.');
      const user = await auth.json();
      if (!user?.id) return fail(401, '로그인 상태를 확인해 주세요.');
      const response = await request(`${supabaseUrl}/rest/v1/rpc/town_action`, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          action: 'snapshot',
          client: body.client,
          channel: null,
          stage: null,
          pos_x: null,
          pos_y: null,
        }),
      });
      if (!response.ok) return fail(403, '공원에 다시 입장한 뒤 시도해 주세요.');
      const grant = voiceGrant(await response.json(), user.id, body.channel, body.stage);
      if (!grant) return fail(403, '현재 채널에서 진행 중인 공연만 연결할 수 있어요.');
      const ttl = Math.max(1, Math.min(60, Math.floor((grant.expiresAt - Date.now()) / 1000)));
      const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: user.id,
        ttl,
      });
      token.addGrant({
        roomJoin: true,
        room: grant.room,
        canPublish: grant.canPublish,
        canSubscribe: !grant.canPublish,
        canPublishData: false,
        canPublishSources: grant.canPublish ? [TrackSource.MICROPHONE] : [],
        canUpdateOwnMetadata: false,
      });
      return res.status(200).json({ url: LIVEKIT_URL, token: await token.toJwt(), ...grant });
    } catch {
      return fail(502, '음성 연결을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  };
}

export default createVoiceHandler();
