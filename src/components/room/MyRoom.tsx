import { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, Move, Palette, RotateCw, Shirt, Trash2, X } from 'lucide-react';
import { MovementJoystick } from '../park/MovementJoystick';
import { Button } from '../ui/Button';
import { ROOM_FURNITURE } from '../../data/roomFurniture';
import { useRoomScene } from '../../hooks/useRoomScene';
import { readSaved } from '../../utils/storage';
import {
  MAX_ROOM_ITEMS,
  canPlace,
  findFreePlacement,
  findRoomFurniture,
  parseSavedRoom,
} from '../../utils/roomLayout';
import type { Avatar } from '../../data/model';
import type { Position } from '../../types/park';
import type {
  PlacedFurniture,
  RoomFurnitureId,
  RoomGhost,
  RoomLayout,
  RoomMode,
  RoomRotation,
  RoomTile,
} from '../../types/room';
import './my-room.css';

function newFurnitureId(item: RoomFurnitureId) {
  return `${item}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function MyRoom({
  avatar,
  storageKey,
  onClose,
  onCustomize,
}: {
  avatar: Avatar;
  storageKey: string;
  onClose: () => void;
  onCustomize: () => void;
}) {
  const [layout, setLayout] = useState<RoomLayout>(() =>
    parseSavedRoom(readSaved(storageKey, null)),
  );
  const [mode, setMode] = useState<RoomMode>('walk');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [ghost, setGhost] = useState<RoomGhost | null>(null);
  const [ready, setReady] = useState(false);
  const [insets, setInsets] = useState({ top: 64, bottom: 16 });
  const motion = useRef<Position>({ x: 0, y: 0 });
  const avatarTile = useRef<RoomTile>({ x: 4, z: 4 });
  const topbarRef = useRef<HTMLElement>(null);
  const trayRef = useRef<HTMLElement>(null);
  const layoutRef = useRef(layout);
  const ghostRef = useRef<RoomGhost | null>(null);
  const pendingRef = useRef<string | null>(null);
  layoutRef.current = layout;
  const selected = layout.items.find((item) => item.id === selectedId) ?? null;
  const selectedFurniture = ghost
    ? findRoomFurniture(ghost.item)
    : selected
      ? findRoomFurniture(selected.item)
      : undefined;

  const putGhost = (next: RoomGhost | null) => {
    ghostRef.current = next;
    setGhost(next);
  };
  const putPending = (id: string | null) => {
    pendingRef.current = id;
  };
  const clearPending = () => {
    putPending(null);
    setMovingId(null);
    putGhost(null);
  };
  const ghostCandidate = (current: RoomGhost, x: number, z: number, r = current.r) =>
    ({
      id: pendingRef.current ?? '__ghost__',
      item: current.item,
      x,
      z,
      r,
    }) satisfies PlacedFurniture;
  const canPlaceGhost = (current: RoomGhost, x: number, z: number, r = current.r) =>
    canPlace(layoutRef.current, ghostCandidate(current, x, z, r), {
      ignoreId: pendingRef.current ?? undefined,
      blockedTiles: [avatarTile.current],
    });
  const commitGhost = () => {
    const currentGhost = ghostRef.current;
    const id = pendingRef.current;
    if (!currentGhost || !id) return;
    const placed: PlacedFurniture = {
      id,
      item: currentGhost.item,
      x: currentGhost.x,
      z: currentGhost.z,
      r: currentGhost.r,
    };
    if (
      !canPlace(layoutRef.current, placed, {
        ignoreId: id,
        blockedTiles: [avatarTile.current],
      })
    ) {
      return;
    }
    const current = layoutRef.current;
    const exists = current.items.some((item) => item.id === id);
    if (!exists && current.items.length >= MAX_ROOM_ITEMS) return;
    const next = exists
      ? {
          items: current.items.map((item) => (item.id === id ? placed : item)),
        }
      : { items: [...current.items, placed] };
    layoutRef.current = next;
    setLayout(next);
    setSelectedId(id);
    clearPending();
  };

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(layout));
    } catch {
      /* Storage can be unavailable in private browsing; the room still works for this visit. */
    }
  }, [layout, storageKey]);

  useEffect(() => {
    const measure = () => {
      const viewportHeight = window.innerHeight || 1;
      const topbarBottom = topbarRef.current?.getBoundingClientRect().bottom ?? 56;
      const trayTop = trayRef.current?.getBoundingClientRect().top;
      const bottom =
        mode === 'decorate' && trayTop !== undefined
          ? Math.max(12, Math.ceil(viewportHeight - trayTop + 8))
          : 12;
      const top = Math.max(12, Math.ceil(topbarBottom + 8));
      setInsets((previous) =>
        previous.top === top && previous.bottom === bottom ? previous : { top, bottom },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (topbarRef.current) observer.observe(topbarRef.current);
    if (trayRef.current) observer.observe(trayRef.current);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, [mode]);

  const { canvas, error } = useRoomScene({
    avatar,
    layout,
    ghost,
    selectedId,
    movingId,
    mode,
    topInset: insets.top,
    bottomInset: insets.bottom,
    motion,
    avatarTile,
    onAvatarTap: onCustomize,
    onSelectItem: (id) => {
      clearPending();
      setSelectedId(id);
      setMode('decorate');
    },
    onFloorTap: (x, z) => {
      if (mode !== 'decorate') return;
      const currentGhost = ghostRef.current;
      if (!currentGhost || !pendingRef.current) {
        setSelectedId(null);
        return;
      }
      if (currentGhost.x === x && currentGhost.z === z) {
        commitGhost();
        return;
      }
      putGhost({ ...currentGhost, x, z, ok: canPlaceGhost(currentGhost, x, z) });
    },
    onHoverTile: (x, z) => {
      const currentGhost = ghostRef.current;
      if (!currentGhost || !pendingRef.current) return;
      if (currentGhost.x === x && currentGhost.z === z) return;
      putGhost({ ...currentGhost, x, z, ok: canPlaceGhost(currentGhost, x, z) });
    },
    onReady: () => setReady(true),
  });

  const enterDecorate = () => {
    clearPending();
    setSelectedId(null);
    setMode('decorate');
  };
  const exitDecorate = () => {
    clearPending();
    setSelectedId(null);
    setMode('walk');
  };
  const addItem = (item: RoomFurnitureId) => {
    const current = layoutRef.current;
    if (current.items.length >= MAX_ROOM_ITEMS) return;
    const r: RoomRotation = 0;
    const spot = findFreePlacement(current, item, r, {
      blockedTiles: [avatarTile.current],
    });
    if (!spot) return;
    const id = newFurnitureId(item);
    putPending(id);
    setSelectedId(id);
    setMovingId(null);
    putGhost({ item, x: spot.x, z: spot.z, r, ok: true });
    setMode('decorate');
  };
  const startMove = () => {
    if (!selected) return;
    const ok = canPlace(layoutRef.current, selected, {
      ignoreId: selected.id,
      blockedTiles: [avatarTile.current],
    });
    putPending(selected.id);
    setMovingId(selected.id);
    setSelectedId(selected.id);
    putGhost({ item: selected.item, x: selected.x, z: selected.z, r: selected.r, ok });
    setMode('decorate');
  };
  const rotate = () => {
    const currentGhost = ghostRef.current;
    if (currentGhost) {
      const r = ((currentGhost.r + 1) % 4) as RoomRotation;
      putGhost({
        ...currentGhost,
        r,
        ok: canPlaceGhost(currentGhost, currentGhost.x, currentGhost.z, r),
      });
      return;
    }
    if (!selected) return;
    const r = ((selected.r + 1) % 4) as RoomRotation;
    const candidate = { ...selected, r };
    if (
      !canPlace(layoutRef.current, candidate, {
        ignoreId: selected.id,
        blockedTiles: [avatarTile.current],
      })
    ) {
      return;
    }
    const next = {
      items: layoutRef.current.items.map((item) => (item.id === selected.id ? candidate : item)),
    };
    layoutRef.current = next;
    setLayout(next);
  };
  const removeSelected = () => {
    if (!selected) return;
    const next = {
      items: layoutRef.current.items.filter((item) => item.id !== selected.id),
    };
    layoutRef.current = next;
    setLayout(next);
    clearPending();
    setSelectedId(null);
  };
  const deselect = () => {
    clearPending();
    setSelectedId(null);
  };

  return (
    <div
      className={`my-room my-room--${mode}${ready ? ' is-ready' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="마이룸"
    >
      <canvas
        ref={canvas}
        className="my-room-canvas"
        aria-label="3D 마이룸. 조이스틱 또는 방향키로 이동하세요."
      />
      <header className="my-room-topbar" ref={topbarRef}>
        <Button
          variant="ghost"
          className="my-room-back"
          onClick={onClose}
          aria-label="공원으로 돌아가기"
          autoFocus
        >
          <ChevronLeft size={16} />
          <span>공원</span>
        </Button>
        <div className="my-room-heading">
          <span>MY ROOM</span>
          <strong>{avatar.name}의 방</strong>
        </div>
        <div className="my-room-actions">
          <Button
            variant="secondary"
            className="my-room-customize"
            onClick={onCustomize}
            aria-label="캐릭터 커스터마이징"
            title="캐릭터 커스터마이징"
          >
            <Shirt size={16} />
            <span>커스터마이징</span>
          </Button>
          <Button
            variant="secondary"
            className="my-room-mode-button"
            onClick={mode === 'walk' ? enterDecorate : exitDecorate}
          >
            {mode === 'walk' ? <Palette size={16} /> : <Check size={16} />}
            <span>{mode === 'walk' ? '꾸미기' : '완료'}</span>
          </Button>
        </div>
      </header>

      {mode === 'walk' ? (
        <>
          <MovementJoystick
            motion={motion}
            id="room-joystick"
            stickId="room-stick"
            className="movement room-movement"
            label="마이룸 이동 조이스틱"
          />
          <p className="my-room-hint">캐릭터를 눌러 모습을 바꾸고, 방을 둘러보세요.</p>
        </>
      ) : (
        <>
          <div className="my-room-decoration-head" aria-live="polite">
            <span>{ghost ? 'PLACING' : 'DECORATING'}</span>
            <strong>
              {ghost
                ? ghost.ok
                  ? '바닥을 눌러 자리를 옮기고, 다시 눌러 놓아요'
                  : '여기에는 놓을 수 없어요'
                : '아래에서 가구를 골라 보세요'}
            </strong>
          </div>
          <section className="my-room-tray" aria-label="가구 목록" ref={trayRef}>
            <div className="my-room-tray-heading">
              <strong>가구</strong>
              {selectedFurniture && (
                <div className="my-room-selection" role="group" aria-label="선택한 가구">
                  <span className="my-room-selection-name">
                    <span aria-hidden="true">{selectedFurniture.icon}</span>
                    {selectedFurniture.name}
                  </span>
                  {ghost ? (
                    <>
                      <Button
                        variant="secondary"
                        onClick={commitGhost}
                        disabled={!ghost.ok}
                        aria-label="여기에 놓기"
                      >
                        <Check size={15} />
                        <span>여기에 놓기</span>
                      </Button>
                      <Button variant="secondary" onClick={rotate} aria-label="가구 회전">
                        <RotateCw size={15} />
                        <span>회전</span>
                      </Button>
                      <Button variant="ghost" onClick={clearPending} aria-label="배치 취소">
                        <X size={15} />
                        <span>취소</span>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="secondary" onClick={startMove} aria-label="가구 옮기기">
                        <Move size={15} />
                        <span>옮기기</span>
                      </Button>
                      <Button variant="secondary" onClick={rotate} aria-label="가구 회전">
                        <RotateCw size={15} />
                        <span>회전</span>
                      </Button>
                      <Button variant="ghost" onClick={removeSelected} aria-label="가구 치우기">
                        <Trash2 size={15} />
                        <span>치우기</span>
                      </Button>
                      <Button variant="ghost" onClick={deselect} aria-label="선택 해제">
                        <X size={15} />
                      </Button>
                    </>
                  )}
                </div>
              )}
              <small>
                {layout.items.length} / {MAX_ROOM_ITEMS}
              </small>
            </div>
            <div className="my-room-catalog">
              {ROOM_FURNITURE.map((furniture) => {
                const disabled = !ready || layout.items.length >= MAX_ROOM_ITEMS || Boolean(error);
                return (
                  <button
                    key={furniture.id}
                    type="button"
                    className={`my-room-item${
                      selectedFurniture?.id === furniture.id ? ' is-selected' : ''
                    }`}
                    onClick={() => addItem(furniture.id)}
                    disabled={disabled}
                    aria-label={`${furniture.name} 추가`}
                  >
                    <span aria-hidden="true">{furniture.icon}</span>
                    <small>{furniture.name}</small>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}

      {!ready && !error && (
        <div className="my-room-loading" role="status">
          <span className="my-room-loading-dot" />
          방을 준비하고 있어요
        </div>
      )}
      {error && (
        <div className="my-room-error" role="alert">
          <strong>3D 방을 열 수 없어요.</strong>
          <span>잠시 후 다시 시도해 주세요.</span>
        </div>
      )}
    </div>
  );
}
