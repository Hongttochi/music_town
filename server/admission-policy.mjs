export const CONSENT_DOCUMENTS = {
  terms: {
    url: '/consent/2026-11-06-v1/terms.html',
    sha256: 'ddd66088d0d28823baee67968ad6137bbac871973a2a30c6bd7b70c8caef67c5',
  },
  privacy: {
    url: '/consent/2026-11-06-v1/privacy.html',
    sha256: 'd5799b03833e7dad099b85a59e1f2b07342e26aef2fa157910a46131cfa2d0e5',
  },
};
export const CONSENT_VERSION = '2026-11-06-v1';
export const CONSENT_TEXT = `MUSIC TOWN 법정대리인 동의
처리 목적: 아동 계정 관리, 프로필 제공, 같은 채널 이용 및 실시간 공연·관람, 신고 처리.
처리 항목: 소셜 계정 식별 정보, 캐릭터·프로필, 채널·게임 내 위치, 공연·대기 상태, 신고 기록. 자기소개·외부 링크는 선택 입력입니다.
공개 범위: 같은 채널에 캐릭터·프로필·게임 내 위치와 공연·대기 상태가 표시됩니다. 마이크를 허용한 공연 음성은 연결된 관객에게 전달되며 앱은 이를 녹음하지 않습니다.
보유 기간: 계정·프로필은 계정 유지 중 보관하고 탈퇴 시 삭제 절차를 진행합니다. 신고·로그·백업의 구체적인 보유·파기 기간은 확정 전입니다. 동의 확인 기록은 계정 유지 기간 동안 보관하며 계정 삭제에 연동합니다.
보호자 확인: PortOne 및 연결된 본인확인업체에서 휴대폰 본인확인을 진행합니다. 서비스는 본인확인 거래번호, 확인된 보호자 성명, 성인 여부, 동의 내용·버전·시각 및 확인 정보의 해시를 보관합니다. 주민등록번호·CI 원문·보호자의 전체 생년월일은 서비스 DB에 저장하지 않습니다.
법정대리인은 동의를 거부할 수 있으며 이 경우 아동은 가입·공원 입장을 진행할 수 없습니다. 열람·정정·삭제·동의 철회는 DooNow(teamsda01@gmail.com)에게 요청할 수 있습니다.
현재 문서는 운영 보유기간과 외부업체 처리 조건을 확정하기 전 검토본입니다. 운영 정보를 확정하면 동의 내용의 새 버전을 적용하고 필요한 동의를 다시 받습니다.`;

export function ageOnKoreanDate(value, now = new Date()) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  const today = new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
  if (value > today || value < '1900-01-01') return null;
  const [year, month, day] = value.split('-').map(Number);
  const [y, m, d] = today.split('-').map(Number);
  return y - year - (m < month || (m === month && d < day) ? 1 : 0);
}

export function validateGuardianResult(result, request, channelKey, now = new Date()) {
  const age = ageOnKoreanDate(result?.verifiedCustomer?.birthDate, now);
  const verified = Date.parse(result?.verifiedAt);
  return (
    result?.status === 'VERIFIED' &&
    result.id === request.verification_id &&
    result.channel?.type === 'LIVE' &&
    result.channel?.key === channelKey &&
    typeof result.verifiedCustomer?.name === 'string' &&
    result.verifiedCustomer.name.trim().length > 0 &&
    typeof result.verifiedCustomer?.phoneNumber === 'string' &&
    result.verifiedCustomer.phoneNumber.length >= 8 &&
    age !== null &&
    age >= 19 &&
    Number.isFinite(verified) &&
    verified >= Date.parse(request.indicated_at) - 30_000 &&
    verified <= now.getTime() + 60_000
  );
}
