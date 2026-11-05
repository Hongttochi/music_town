import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const authConfigured = Boolean(
  url && /^https:\/\//.test(url) && key && !key.startsWith('sb_secret_'),
);
export const supabase = authConfigured
  ? createClient(url!, key!, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export async function signIn(provider: 'google' | 'kakao') {
  if (!supabase) throw new Error('로그인 서비스가 아직 연결되지 않았어요.');
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin + '/',
      // `scopes` adds to Supabase's defaults, including account_email.
      // Override the outgoing Kakao scope; also enable "Allow users without an email".
      queryParams:
        provider === 'kakao' ? { scope: 'profile_nickname,profile_image' } : undefined,
    },
  });
  if (error) throw error;
}
