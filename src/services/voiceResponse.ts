type VoiceToken = {
  url: string;
  token: string;
  performerId: string;
  expiresAt: number;
  canPublish: boolean;
};

/** A proxy/platform failure can return an empty body or HTML instead of API JSON. */
export async function readVoiceToken(response: Response): Promise<VoiceToken> {
  const fallback =
    response.status === 404 || response.status === 405
      ? '음성 연결 서버를 찾지 못했어요. 서버 실행 또는 배포 설정을 확인해 주세요.'
      : response.status === 401
        ? '로그인이 만료됐어요. 다시 로그인한 뒤 연결해 주세요.'
        : response.status === 429
          ? '음성 연결 요청이 많아요. 잠시 후 다시 연결해 주세요.'
          : response.status >= 500
            ? '음성 서버가 응답하지 않아요. 잠시 후 다시 연결해 주세요.'
            : '음성 서버에서 올바른 연결 정보를 받지 못했어요. 다시 연결해 주세요.';
  const body = await response.text();
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    throw new Error(fallback);
  }
  if (!response.ok) {
    const message = data && typeof data === 'object' && 'error' in data ? data.error : null;
    throw new Error(typeof message === 'string' && message.trim() ? message : fallback);
  }
  if (!data || typeof data !== 'object') throw new Error(fallback);
  const value = data as Partial<VoiceToken>;
  if (
    typeof value.url !== 'string' ||
    !/^wss?:\/\//.test(value.url) ||
    typeof value.token !== 'string' ||
    !value.token.trim() ||
    typeof value.performerId !== 'string' ||
    !value.performerId ||
    typeof value.expiresAt !== 'number' ||
    !Number.isFinite(value.expiresAt) ||
    typeof value.canPublish !== 'boolean'
  )
    throw new Error(fallback);
  return value as VoiceToken;
}
