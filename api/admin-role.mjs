import { createClient } from '@supabase/supabase-js';

export function createAdminRoleHandler(env = process.env, makeClient = createClient) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const fail = (status, error) => res.status(status).json({ error });
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return fail(405, 'GET 요청이 필요해요.');
    }
    const authorization = req.headers.authorization;
    if (typeof authorization !== 'string' || !/^Bearer \S+$/.test(authorization))
      return fail(401, '로그인이 필요해요.');
    const clean = (value) => (typeof value === 'string' ? value.trim() : '');
    const url = clean(env.SUPABASE_URL) || clean(env.VITE_SUPABASE_URL);
    const key = clean(env.SUPABASE_PUBLISHABLE_KEY) || clean(env.VITE_SUPABASE_PUBLISHABLE_KEY);
    if (!url || !key) return fail(503, '권한 확인 서비스가 아직 준비되지 않았어요.');
    try {
      const client = makeClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { data, error } = await client.auth.getUser(authorization.slice(7));
      if (error || !data?.user?.id) return fail(401, '다시 로그인해 주세요.');
      const admins = new Set(
        clean(env.ADMIN_EMAILS)
          .split(',')
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean),
      );
      // Only Supabase's verified account email is authoritative, never request fields or metadata.
      const email = clean(data.user.email).toLowerCase();
      const isAdmin = Boolean(data.user.email_confirmed_at && email && admins.has(email));
      return res.status(200).json({ isAdmin });
    } catch {
      return fail(502, '권한을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  };
}

export default createAdminRoleHandler();
