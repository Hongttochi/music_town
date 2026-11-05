import { createClient } from '@supabase/supabase-js';

export function createDeleteAccountHandler(env = process.env, makeClient = createClient) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const fail = (status, error) => res.status(status).json({ error });
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return fail(405, 'POST 요청이 필요해요.');
    }
    const authorization = req.headers.authorization;
    if (typeof authorization !== 'string' || !/^Bearer \S+$/.test(authorization))
      return fail(401, '다시 로그인한 뒤 탈퇴해 주세요.');
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return fail(400, '잘못된 요청이에요.');
    }
    if (body?.confirmation !== 'delete-my-account') return fail(400, '계정 삭제를 확인해 주세요.');
    const clean = (value) => (typeof value === 'string' ? value.trim() : '');
    const url = clean(env.SUPABASE_URL) || clean(env.VITE_SUPABASE_URL);
    const publicKey =
      clean(env.SUPABASE_PUBLISHABLE_KEY) || clean(env.VITE_SUPABASE_PUBLISHABLE_KEY);
    const secret = clean(env.SUPABASE_SECRET_KEY) || clean(env.SUPABASE_SERVICE_ROLE_KEY);
    if (!url || !publicKey || !secret)
      return fail(503, '탈퇴 서비스가 아직 준비되지 않았어요. 잠시 후 다시 시도해 주세요.');
    try {
      const options = {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      };
      const authClient = makeClient(url, publicKey, options);
      // Never accept a user ID from the browser: the verified bearer selects the account.
      const { data, error } = await authClient.auth.getUser(authorization.slice(7));
      if (error || !data?.user?.id) return fail(401, '다시 로그인한 뒤 탈퇴해 주세요.');
      const admin = makeClient(url, secret, options);
      const { error: failure } = await admin.auth.admin.deleteUser(data.user.id, false);
      if (failure) return fail(502, '계정을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
      return res.status(200).json({ deleted: true });
    } catch {
      return fail(502, '탈퇴 요청을 처리하지 못했어요. 연결을 확인하고 다시 시도해 주세요.');
    }
  };
}
export default createDeleteAccountHandler();
