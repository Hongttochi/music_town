import { useRef, useState } from 'react';
import { supabase } from '../auth';
import type { Participant } from '../useTown';
import { Button } from './ui/Button';
import './participant-profile.css';

const reasons = [
  ['sexual', '성적 발언·성희롱'],
  ['harassment', '괴롭힘·협박'],
  ['hate', '욕설·혐오 표현'],
  ['privacy', '개인정보 노출·사칭'],
  ['disruption', '공연·이용 방해'],
  ['other', '기타'],
] as const;

export function ReportForm({ target, onClose }: { target: Participant; onClose: () => void }) {
  const [reason, setReason] = useState('sexual');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState('');
  const [error, setError] = useState('');
  const requestId = useRef(crypto.randomUUID());
  const submitting = useRef(false);
  if (receipt)
    return (
      <div className="report-form">
        <h3>신고가 접수됐어요</h3>
        <p>운영자 확인 목록에 저장됐어요. 신고 접수만으로 상대방이 자동 제재되지는 않아요.</p>
        <p className="report-receipt">접수 번호: {receipt}</p>
        <Button onClick={onClose}>닫기</Button>
      </div>
    );
  return (
    <form
      className="report-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (submitting.current) return;
        submitting.current = true;
        setBusy(true);
        setError('');
        try {
          if (!supabase) throw new Error('로그인 후 신고할 수 있어요.');
          const { data, error: failure } = await supabase.rpc('submit_town_report', {
            request_id: requestId.current,
            target_user: target.id,
            report_reason: reason,
            report_details: details.trim(),
          });
          if (failure) {
            if (failure.message.includes('TARGET_LEFT'))
              throw new Error('상대방이 채널을 떠났어요. 운영자 이메일로 문의해 주세요.');
            if (failure.message.includes('REPORT_RATE_LIMIT'))
              throw new Error('신고를 너무 빠르게 보냈어요. 잠시 후 다시 시도해 주세요.');
            if (failure.message.includes('SESSION_EXPIRED'))
              throw new Error('채널 연결이 만료됐어요. 다시 입장해 주세요.');
            throw new Error(
              '신고를 접수하지 못했어요. 다시 시도하거나 teamsda01@gmail.com으로 문의해 주세요.',
            );
          }
          if (typeof data !== 'string' || data !== requestId.current)
            throw new Error('접수 결과를 확인하지 못했어요. 다시 시도해 주세요.');
          setReceipt(data);
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : '신고 접수에 실패했어요.');
        } finally {
          submitting.current = false;
          setBusy(false);
        }
      }}
    >
      <p className="report-target">
        <span>신고 대상</span>
        <strong>{target.avatar.name}</strong>
      </p>
      <fieldset disabled={busy}>
        <legend>신고 사유</legend>
        {reasons.map(([value, label]) => (
          <label key={value}>
            <input
              type="radio"
              name="report-reason"
              value={value}
              checked={reason === value}
              onChange={() => setReason(value)}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <label htmlFor="report-details">상황 설명</label>
      <textarea
        id="report-details"
        required
        minLength={10}
        maxLength={1000}
        rows={4}
        value={details}
        disabled={busy}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="발생 시각과 구체적인 상황을 10자 이상 적어 주세요."
      />
      <small className="report-counter">{details.length} / 1000</small>
      <p className="report-disclosure">
        신고 대상·사유·설명·채널과 신고자 계정이 운영자 검토를 위해 저장됩니다. 다른 이용자는 신고
        내용을 볼 수 없어요.
      </p>
      {error && (
        <p role="alert" className="report-error">
          {error}
        </p>
      )}
      <div className="report-actions">
      <Button variant="secondary" onClick={onClose} disabled={busy}>취소</Button>
      <Button type="submit" variant="primary" disabled={busy || details.trim().length < 10}>
        {busy ? '접수 중…' : '신고 접수하기'}
      </Button>
      </div>
    </form>
  );
}
