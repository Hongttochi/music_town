import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Eye, EyeOff, Plus, Send, Trash2 } from 'lucide-react';
import { reveal } from '../utils/reveal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ErrorCard } from '../components/ui/ErrorCard';
import { Toast } from '../components/ui/Toast';
import { useAdminRpc } from '../hooks/useAdminRpc';
import { formatClock } from '../utils/format';
import {
  AdminError,
  rpc,
  type Notice as AdminNotice,
  type NoticeStatus as Status,
} from '../services/adminRepository';
import './notices.css';

type Form = Pick<AdminNotice, 'label' | 'title' | 'body'>;
type Ask = 'publish' | 'hide' | 'delete' | 'discard';

const LIMIT = { label: 10, title: 40, body: 1000 };
const labelIdeas = ['마을 안내', '산책 메모', '공연 소식', '점검 안내', '이벤트'];
const statusText: Record<Status, [string, string]> = {
  published: ['게시 중', 'b-green'],
  draft: ['임시 저장', 'b-amber'],
  hidden: ['내림', 'b-gray'],
};
const toParagraphs = (body: string) =>
  body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

export function Notices() {
  const { data, error, reload } = useAdminRpc<AdminNotice[]>('admin_notices');
  const [list, setList] = useState<AdminNotice[]>([]);
  const [selId, setSelId] = useState('');
  const sel = list.find((n) => n.id === selId);
  const [form, setForm] = useState<Form>(() => pick(sel));
  const [ask, setAsk] = useState<Ask | null>(null);
  const [shownAsk, setShownAsk] = useState<Ask>('publish');
  const [pendingSel, setPendingSel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const closeEditor = () => {
    if (busy || ask) return;
    if (dirty) {
      setPendingSel('__close__');
      open('discard');
    } else setEditorOpen(false);
  };
  useEffect(() => {
    if (!editorOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    editorRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [editorOpen]);

  // Sync with the server list; select the first notice when nothing valid is selected.
  useEffect(() => {
    if (!data) return;
    setList(data);
    if (!data.some((n) => n.id === selId)) {
      setSelId(data[0]?.id ?? '');
      setForm(pick(data[0]));
    }
    // Run only when a new list arrives, not when the selection changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const dirty =
    !!sel && (form.label !== sel.label || form.title !== sel.title || form.body !== sel.body);
  const problems = [
    !form.title.trim() && '제목을 입력해 주세요',
    !form.body.trim() && '본문을 입력해 주세요',
    form.label.length > LIMIT.label && `분류는 ${LIMIT.label}자까지예요`,
    form.title.length > LIMIT.title && `제목은 ${LIMIT.title}자까지예요`,
    form.body.length > LIMIT.body && `본문은 ${LIMIT.body}자까지예요`,
  ].filter(Boolean) as string[];

  const open = (a: Ask) => {
    setShownAsk(a);
    setAsk(a);
  };
  const cancel = useCallback(() => {
    setAsk(null);
    setPendingSel(null);
  }, []);
  const [toast, setToast] = useState<{ text: string; n: number; id?: string } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(id);
  }, [toast]);
  const fail = (e: unknown) =>
    setToast({ text: e instanceof AdminError ? e.message : '저장하지 못했어요.', n: Date.now() });

  // Save on the server, then sync the list and the form with the returned row.
  const save = async (fields: Form, status: Status, id: string | null = selId) => {
    const row = await rpc<AdminNotice>('admin_save_notice', {
      notice_id: id,
      notice_label: fields.label,
      notice_title: fields.title,
      notice_body: fields.body,
      next_status: status,
    });
    setList((l) =>
      l.some((n) => n.id === row.id) ? l.map((n) => (n.id === row.id ? row : n)) : [row, ...l],
    );
    setSelId(row.id);
    setForm(pick(row));
    return row;
  };
  const run = async (task: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      await task();
    } catch (e) {
      fail(e);
      if (e instanceof AdminError && e.code === 'NOTICE_NOT_FOUND') void reload();
    } finally {
      setBusy(false);
    }
  };

  const select = (id: string) => {
    setEditorOpen(true);
    if (id === selId) return;
    if (dirty) {
      setPendingSel(id);
      open('discard');
      return;
    }
    setSelId(id);
    setForm(pick(list.find((n) => n.id === id)));
  };
  const NEW = '__new__';
  const isBlank = (n: AdminNotice) =>
    n.status === 'draft' &&
    !n.title.trim() &&
    !n.body.trim() &&
    // For the selected notice, unsaved input counts too.
    (n.id !== selId || (!form.title.trim() && !form.body.trim()));

  const create = () => {
    setEditorOpen(true);
    // Send the user to an existing blank draft instead of creating another. The server enforces the same rule.
    const blank = list.find(isBlank);
    if (blank) {
      setToast({
        text: '아직 비어 있는 공지가 있어요. 그 공지부터 써 주세요.',
        n: Date.now(),
        id: blank.id,
      });
      if (blank.id !== selId) select(blank.id);
      return;
    }
    if (dirty) {
      setPendingSel(NEW);
      open('discard');
      return;
    }
    void run(makeNew);
  };
  const makeNew = () => save({ label: '마을 안내', title: '', body: '' }, 'draft', null);
  const saveDraft = () => void run(() => save(form, sel?.status === 'hidden' ? 'hidden' : 'draft'));
  const confirm = () =>
    void run(async () => {
      const kind = ask;
      const target = pendingSel;
      setAsk(null);
      setPendingSel(null);
      if (kind === 'publish') await save(form, 'published');
      if (kind === 'hide' && sel) await save(pick(sel), 'hidden');
      if (kind === 'delete') {
        await rpc('admin_delete_notice', { notice_id: selId });
        const rest = list.filter((n) => n.id !== selId);
        setList(rest);
        setSelId(rest[0]?.id ?? '');
        setForm(pick(rest[0]));
        setEditorOpen(false);
      }
      if (kind === 'discard' && target === NEW) {
        setForm(pick(sel));
        await makeNew();
      } else if (kind === 'discard' && target === '__close__') {
        setForm(pick(sel));
        setEditorOpen(false);
      } else if (kind === 'discard' && target) {
        setSelId(target);
        setForm(pick(list.find((n) => n.id === target)));
      }
    });

  if (!data) return <ErrorCard error={error} reload={reload} />;

  const live = list.filter((n) => n.status === 'published');
  const asks: Record<
    Ask,
    { title: string; desc: string; label: string; tone: 'primary' | 'danger' }
  > = {
    publish: {
      title: sel?.status === 'published' ? '수정한 내용을 게시할까요?' : '이 공지를 게시할까요?',
      desc: '게시하면 공원 게시판에서 모든 이용자에게 바로 보여요.',
      label: '게시하기',
      tone: 'primary',
    },
    hide: {
      title: '이 공지를 내릴까요?',
      desc: '공원 게시판에서 사라져요. 공지는 남아 있어서 나중에 다시 게시할 수 있어요.',
      label: '내리기',
      tone: 'danger',
    },
    delete: {
      title: '이 공지를 삭제할까요?',
      desc: '삭제한 공지는 되돌릴 수 없어요. 게시 중이었다면 공원 게시판에서도 사라져요.',
      label: '삭제',
      tone: 'danger',
    },
    discard: {
      title: '저장하지 않은 내용이 있어요',
      desc: '다른 공지로 넘어가면 지금 고친 내용은 사라져요.',
      label: '버리고 이동',
      tone: 'danger',
    },
  };
  const a = asks[shownAsk];

  return (
    <>
      <div className="a-grid g-notice" inert={editorOpen}>
        <div {...reveal(0)}>
          <div className="a-card">
            <div className="a-card-head" style={{ alignItems: 'center' }}>
              <p className="a-list-title" style={{ margin: 0 }}>
                공지 {list.length}개 · 게시 중 {live.length}개
              </p>
              <button className="a-btn a-btn-primary" disabled={busy} onClick={create}>
                <Plus size={15} /> 새 공지
              </button>
            </div>
            {list.map((n) => (
              <button
                // A new key replays the flash when pointing at the blank draft.
                key={toast?.id === n.id ? `${n.id}-${toast.n}` : n.id}
                className={`a-saved ${toast?.id === n.id ? 'flash' : ''}`}
                aria-pressed={n.id === selId}
                onClick={() => select(n.id)}
              >
                <div className="a-saved-row">
                  <span className="a-ellipsis">{n.title || '제목 없는 공지'}</span>
                  <span className={`a-badge ${statusText[n.status][1]}`}>
                    {statusText[n.status][0]}
                  </span>
                </div>
                <div className="a-saved-sub">
                  <span>{n.label || '분류 없음'}</span>
                  <span>{formatClock(n.updatedAt)}</span>
                </div>
              </button>
            ))}
            {!list.length && <p className="a-cap">공지가 없어요. 새 공지를 만들어 보세요.</p>}
          </div>
        </div>

        {editorOpen &&
          sel &&
          createPortal(
            <div
              className="a-notice-overlay"
              onClick={(e) => {
                if (e.target === e.currentTarget) closeEditor();
              }}
            >
              <div
                className="a-notice-dialog"
                inert={ask !== null}
                role="dialog"
                aria-modal="true"
                aria-labelledby="notice-editor-title"
                ref={editorRef}
                tabIndex={-1}
                onKeyDown={(e) => {
                  if (ask) return;
                  if (e.key === 'Escape') {
                    e.stopPropagation();
                    closeEditor();
                  }
                  if (e.key === 'Tab') {
                    const nodes = editorRef.current?.querySelectorAll<HTMLElement>(
                      'button:not(:disabled), input, textarea, [tabindex="0"]',
                    );
                    if (!nodes?.length) return;
                    const first = nodes[0],
                      last = nodes[nodes.length - 1];
                    if (
                      e.shiftKey &&
                      (document.activeElement === first ||
                        document.activeElement === editorRef.current)
                    ) {
                      e.preventDefault();
                      last.focus();
                    } else if (
                      !e.shiftKey &&
                      (document.activeElement === last ||
                        document.activeElement === editorRef.current)
                    ) {
                      e.preventDefault();
                      first.focus();
                    }
                  }
                }}
              >
                <header className="a-notice-dialog-head">
                  <h2 id="notice-editor-title">공지 작성 및 수정</h2>
                  <button
                    className="a-icon-btn"
                    aria-label="공지 편집 닫기"
                    disabled={busy}
                    onClick={closeEditor}
                  >
                    <X size={20} />
                  </button>
                </header>
                <div
                  className="a-grid a-notice-editor-grid"
                  style={{ minWidth: 0, alignItems: 'start' }}
                  key={sel.id}
                >
                  <div {...reveal(1)}>
                    <div className="a-card a-editor">
                      <div className="a-card-head">
                        <div>
                          <h3>
                            {sel.status === 'draft' && !sel.title ? '새 공지 쓰기' : '공지 수정'}
                          </h3>
                          <p className="a-cap">
                            빈 줄로 문단을 나눠요 ·{' '}
                            {sel.status === 'published'
                              ? '고친 내용은 다시 게시해야 반영돼요'
                              : '게시 전까지 이용자에게 보이지 않아요'}
                          </p>
                        </div>
                        <span className={`a-badge ${statusText[sel.status][1]}`}>
                          {statusText[sel.status][0]}
                        </span>
                      </div>

                      <label className="a-input">
                        <span>
                          분류{' '}
                          <em>
                            {form.label.length}/{LIMIT.label}
                          </em>
                        </span>
                        <input
                          value={form.label}
                          onChange={(e) => setForm({ ...form, label: e.target.value })}
                        />
                      </label>
                      <div className="a-chips" style={{ marginTop: -6 }}>
                        {labelIdeas.map((l) => (
                          <button
                            key={l}
                            className="a-chip"
                            aria-pressed={form.label === l}
                            onClick={() => setForm({ ...form, label: l })}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                      <label className="a-input">
                        <span>
                          제목{' '}
                          <em>
                            {form.title.length}/{LIMIT.title}
                          </em>
                        </span>
                        <input
                          value={form.title}
                          placeholder="예: 이번 주말 밤 공연이 늘어나요"
                          onChange={(e) => setForm({ ...form, title: e.target.value })}
                        />
                      </label>
                      <label className="a-input">
                        <span>
                          본문{' '}
                          <em>
                            {form.body.length}/{LIMIT.body}
                          </em>
                        </span>
                        <textarea
                          rows={9}
                          value={form.body}
                          placeholder={'첫 문단\n\n두 번째 문단'}
                          onChange={(e) => setForm({ ...form, body: e.target.value })}
                        />
                      </label>

                      {problems.length > 0 && (dirty || sel.status !== 'published') && (
                        <p className="a-warn">{problems[0]}</p>
                      )}
                      <div className="a-actions" style={{ flexWrap: 'wrap', marginTop: 4 }}>
                        <button
                          className="a-btn a-btn-primary"
                          disabled={
                            busy || problems.length > 0 || (sel.status === 'published' && !dirty)
                          }
                          onClick={() => open('publish')}
                        >
                          <Send size={14} />{' '}
                          {sel.status === 'published' ? '수정 내용 게시' : '게시하기'}
                        </button>
                        {sel.status !== 'published' && (
                          <button
                            className="a-btn a-btn-ghost"
                            disabled={busy || !dirty}
                            onClick={saveDraft}
                          >
                            임시 저장
                          </button>
                        )}
                        {sel.status === 'published' && (
                          <button
                            className="a-btn a-btn-ghost"
                            disabled={busy}
                            onClick={() => open('hide')}
                          >
                            <EyeOff size={14} /> 내리기
                          </button>
                        )}
                        {dirty && (
                          <button className="a-btn a-btn-ghost" onClick={() => setForm(pick(sel))}>
                            되돌리기
                          </button>
                        )}
                        <button
                          className="a-btn a-btn-ghost a-btn-del"
                          disabled={busy}
                          onClick={() => open('delete')}
                        >
                          <Trash2 size={14} /> 삭제
                        </button>
                      </div>
                    </div>
                  </div>

                  <div {...reveal(2)}>
                    <div className="a-card">
                      <div className="a-card-head" style={{ marginBottom: 18 }}>
                        <div>
                          <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Eye size={14} /> 미리보기
                          </h3>
                          <p className="a-cap">공원 게시판에 이렇게 보여요</p>
                        </div>
                      </div>
                      <article className="a-paper">
                        <span className="a-paper-pin" />
                        <span className="a-paper-label">{form.label || '분류'}</span>
                        <h4>{form.title || '제목을 입력해 주세요'}</h4>
                        {(toParagraphs(form.body).length
                          ? toParagraphs(form.body)
                          : ['본문을 입력해 주세요']
                        ).map((p, i) => (
                          <p key={i}>{p}</p>
                        ))}
                        <footer>MUSIC TOWN</footer>
                      </article>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )}
      </div>

      {toast && <Toast text={toast.text} stamp={toast.n} />}
      <ConfirmDialog
        open={ask !== null}
        title={a.title}
        confirmLabel={a.label}
        tone={a.tone}
        onConfirm={confirm}
        onCancel={cancel}
      >
        <p>{a.desc}</p>
        {sel && shownAsk !== 'discard' && (
          <dl>
            <dt>분류</dt>
            <dd>{(shownAsk === 'publish' ? form.label : sel.label) || '분류 없음'}</dd>
            <dt>제목</dt>
            <dd>{(shownAsk === 'publish' ? form.title : sel.title) || '제목 없는 공지'}</dd>
          </dl>
        )}
      </ConfirmDialog>
    </>
  );
}

function pick(n?: AdminNotice): Form {
  return { label: n?.label ?? '', title: n?.title ?? '', body: n?.body ?? '' };
}
