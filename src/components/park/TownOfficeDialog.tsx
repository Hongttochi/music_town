import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Flaticon } from '../ui/Flaticon';
import { DialogPanel, PanelHeading } from '../ui/Panel';
import { Button } from '../ui/Button';
import {
  letterRecipients,
  listLetters,
  readLetter,
  sendLetter,
  type TownLetter,
} from '../../services/letters';
import type { Participant } from '../../hooks/useTown';
import './town-office.css';

type Tab = 'inbox' | 'sent' | 'compose';
export function TownOfficeDialog({ demo, onClose }: { demo: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [tab, setTab] = useState<Tab>('inbox');
  const [letters, setLetters] = useState<TownLetter[]>([]);
  const [people, setPeople] = useState<Participant[]>([]);
  const [selected, setSelected] = useState<TownLetter | null>(null);
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const requestId = useRef(crypto.randomUUID());
  const sendLock = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    const node = dialog.current!;
    node.showModal();
    return () => {
      alive.current = false;
      node.close();
    };
  }, []);
  useEffect(() => {
    let active = true;
    setError('');
    setBusy(true);
    setSelected(null);
    setLetters([]);
    if (demo) {
      setBusy(false);
      return;
    }
    const load = async () => {
      try {
        if (tab === 'compose') {
          const rows = await letterRecipients();
          if (active) {
            setPeople(rows);
            setRecipient((id) => (rows.some((p) => p.id === id) ? id : ''));
          }
        } else {
          const rows = await listLetters(tab, offset);
          if (active) setLetters(rows);
        }
      } catch (failure) {
        if (active) setError((failure as Error).message);
      } finally {
        if (active) setBusy(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [tab, offset, revision, demo]);
  const changeTab = (value: Tab) => {
    setTab(value);
    setOffset(0);
    setSelected(null);
    setError('');
    setNotice('');
  };
  const draftChanged = () => {
    requestId.current = crypto.randomUUID();
    setNotice('');
  };
  const close = () => {
    if (sendLock.current) return;
    if (
      (subject.trim() || body.trim()) &&
      !window.confirm('작성 중인 편지를 저장하지 않고 닫을까요?')
    )
      return;
    onClose();
  };
  const openLetter = async (letter: TownLetter) => {
    setSelected(letter);
    setError('');
    if (tab !== 'inbox' || letter.readAt) return;
    try {
      const readAt = await readLetter(letter.id);
      if (alive.current) {
        setLetters((rows) => rows.map((row) => (row.id === letter.id ? { ...row, readAt } : row)));
        setSelected((row) => (row?.id === letter.id ? { ...row, readAt } : row));
      }
    } catch (failure) {
      if (alive.current) setError((failure as Error).message);
    }
  };
  return (
    <DialogPanel
      ref={dialog}
      className="town-office-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div id={titleId}>
        <PanelHeading title="동사무소" onClose={sending ? undefined : close} />
      </div>
      <div className="office-clerk">
        <img
          className="office-clerk-portrait"
          src="/art/office-sol.png"
          width={60}
          height={72}
          alt=""
        />
        <div className="office-clerk-copy">
          <span className="office-clerk-badge">직원 · 솔</span>
          <p>
            편지를 전해드릴게요.
            <br />
            팔로우한 주민에게 마음을 남겨보세요.
          </p>
        </div>
      </div>
      <div className="office-tabs" role="group" aria-label="편지함 선택">
        {(
          [
            ['inbox', '받은 편지', 'email_open'],
            ['sent', '보낸 편지', 'send-mail'],
            ['compose', '편지 쓰기', 'email'],
          ] as const
        ).map(([value, label, icon]) => (
          <Button
            key={value}
            variant="choice"
            aria-pressed={tab === value}
            disabled={sending}
            onClick={() => changeTab(value)}
          >
            <Flaticon name={icon} size={20} />
            {label}
          </Button>
        ))}
      </div>
      {demo ? (
        <p className="office-empty">편지는 로그인 후 이용할 수 있어요.</p>
      ) : (
        <>
          {notice && (
            <p className="office-success" role="status">
              {notice}
            </p>
          )}
          {error && (
            <p className="office-error" role="alert">
              {error}
            </p>
          )}
          <div className="office-toolbar">
            <span>
              {tab === 'compose'
                ? '내가 팔로우한 주민'
                : tab === 'inbox'
                  ? '내게 도착한 편지'
                  : '내가 보낸 편지'}
            </span>
            <Button
              variant="ghost"
              disabled={busy || sending}
              aria-label="편지함 새로고침"
              onClick={() => setRevision((v) => v + 1)}
            >
              <RefreshCw size={14} />
              새로고침
            </Button>
          </div>
          {busy && <p role="status">불러오는 중…</p>}
          {tab === 'compose' ? (
            <form
              className="office-compose"
              onSubmit={async (event) => {
                event.preventDefault();
                if (sendLock.current || !recipient || !subject.trim() || !body.trim()) return;
                sendLock.current = true;
                setSending(true);
                setError('');
                setNotice('');
                try {
                  await sendLetter(recipient, subject.trim(), body.trim(), requestId.current);
                  if (alive.current) {
                    setSubject('');
                    setBody('');
                    requestId.current = crypto.randomUUID();
                    setNotice('편지를 보냈어요.');
                  }
                } catch (failure) {
                  if (alive.current) setError((failure as Error).message);
                } finally {
                  sendLock.current = false;
                  if (alive.current) setSending(false);
                }
              }}
            >
              <label>
                받는 사람
                <select
                  value={recipient}
                  disabled={busy || sending}
                  required
                  onChange={(e) => {
                    setRecipient(e.target.value);
                    draftChanged();
                  }}
                >
                  <option value="">주민 선택</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.avatar.name}
                    </option>
                  ))}
                </select>
              </label>
              {!busy && !people.length && !error && (
                <p className="office-empty">
                  팔로우한 주민이 없어요. 주민 프로필에서 먼저 팔로우해 주세요.
                </p>
              )}
              <label>
                제목
                <input
                  value={subject}
                  maxLength={80}
                  required
                  disabled={sending}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    draftChanged();
                  }}
                  placeholder="제목을 입력하세요"
                />
              </label>
              <label>
                내용
                <textarea
                  value={body}
                  maxLength={2000}
                  required
                  disabled={sending}
                  rows={7}
                  onChange={(e) => {
                    setBody(e.target.value);
                    draftChanged();
                  }}
                  placeholder="편지 내용을 입력하세요"
                />
              </label>
              <div className="office-compose-footer">
                <span>{body.length.toLocaleString()} / 2,000</span>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={busy || sending || !recipient || !subject.trim() || !body.trim()}
                >
                  <Flaticon name="send-mail" size={20} />
                  {sending ? '보내는 중…' : '편지 보내기'}
                </Button>
              </div>
            </form>
          ) : selected ? (
            <article className="office-letter">
              <Button variant="ghost" onClick={() => setSelected(null)}>
                <ArrowLeft size={14} />
                목록
              </Button>
              <h3>{selected.subject}</h3>
              <p className="office-letter-meta">
                {selected.senderName} → {selected.recipientName}
                <br />
                {new Date(selected.createdAt).toLocaleString('ko-KR')}
              </p>
              <div className="office-letter-body">{selected.body}</div>
            </article>
          ) : (
            !busy && (
              <>
                <div className="office-letter-list">
                  {letters.map((letter) => (
                    <button
                      type="button"
                      key={letter.id}
                      className="office-letter-row"
                      onClick={() => void openLetter(letter)}
                    >
                      <Flaticon name={letter.readAt ? 'email_open' : 'email'} size={24} />
                      <span>
                        <strong>{letter.subject}</strong>
                        <small>
                          {tab === 'inbox' ? letter.senderName : letter.recipientName} ·{' '}
                          {new Date(letter.createdAt).toLocaleDateString('ko-KR')}
                        </small>
                      </span>
                      <em>{letter.readAt ? '읽음' : tab === 'inbox' ? '새 편지' : '안 읽음'}</em>
                    </button>
                  ))}
                </div>
                {!letters.length && !error && (
                  <p className="office-empty">
                    {offset ? '더 이상 편지가 없어요.' : '아직 편지가 없어요.'}
                  </p>
                )}
                <div className="office-pagination">
                  <Button
                    variant="secondary"
                    disabled={offset === 0}
                    onClick={() => setOffset((v) => Math.max(0, v - 30))}
                  >
                    이전
                  </Button>
                  <span>{offset / 30 + 1} 페이지</span>
                  <Button
                    variant="secondary"
                    disabled={letters.length < 30}
                    onClick={() => setOffset((v) => v + 30)}
                  >
                    다음
                  </Button>
                </div>
              </>
            )
          )}
        </>
      )}
    </DialogPanel>
  );
}
