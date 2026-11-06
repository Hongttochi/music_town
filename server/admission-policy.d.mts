export const CONSENT_DOCUMENTS: Record<'terms' | 'privacy', { url: string; sha256: string }>;
export const CONSENT_VERSION: string;
export const CONSENT_TEXT: string;
export function ageOnKoreanDate(value: unknown, now?: Date): number | null;
export function validateGuardianResult(
  result: unknown,
  request: unknown,
  channelKey: string,
  now?: Date,
): boolean;
