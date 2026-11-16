import { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, Move, Palette, RotateCw, X } from 'lucide-react';
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
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [ghost, setGhost] = useState<RoomGhost | null>(null);
  const [ready, setReady] = useState(false);
  const motion = useRef<Position>({ x: 0, y: 0 });
  const avatarTile = useRef<RoomTile>({ x: 4, z: 4 });
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const selected = layout.items.find((item) => item.id === selectedId) ?? null;
  const selectedFurniture = selected ? findRoomFurniture(selected.item) : undefined;

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(layout));
    } catch {
      /* Storage can be unavailable in private browsing; the room still works for this visit. */
    }
  }, [layout, storageKey]);

  const { canvas, error } = useRoomScene({
    avatar,
    layout,
    ghost,
    selectedId,
    movingId,
    mode,
    motion,
    avatarTile,
    onAvatarTap: onCustomize,
    onSelectItem: (id) => {
      setSelectedId(id);
      setMode('decorate');
      setPendingId(null);
      setMovingId(null);
      setGhost(null);
    },
    onFloorTap: (x, z) => {
      if (mode !== 'decorate' || !ghost || !pendingId) return;
      const placed: PlacedFurniture = {
        id: pendingId,
        item: ghost.item,
        x,
        z,
        r: ghost.r,
      };
      if (
        !canPlace(layoutRef.current, placed, {
          ignoreId: pendingId,
          blockedTiles: [avatarTile.current],
        })
      ) {
        return;
      }
      const current = layoutRef.current;
      const exists = current.items.some((item) => item.id === pendingId);
      const next = exists
        ? {
            items: current.items.map((item) => (item.id === pendingId ? placed : item)),
          }
        : current.items.length >= MAX_ROOM_ITEMS
          ? current
          : { items: [...current.items, placed] };
      layoutRef.current = next;
      setLayout(next);
      setSelectedId(pendingId);
      setPendingId(null);
      setMovingId(null);
      setGhost(null);
    },
    onHoverTile: (x, z) => {
      if (!pendingId) return;
      setGhost((current) => {
        if (!current) return current;
        const placed: PlacedFurniture = {
          id: pendingId,
          item: current.item,
          x,
          z,
          r: current.r,
        };
        return {
          ...current,
          x,
          z,
          ok: canPlace(layoutRef.current, placed, {
            ignoreId: pendingId,
            blockedTiles: [avatarTile.current],
          }),
        };
      });
    },
    onReady: () => setReady(true),
  });

  const enterDecorate = () => {
    setMode('decorate');
    setPendingId(null);
    setMovingId(null);
    setGhost(null);
  };
  const exitDecorate = () => {
    setMode('walk');
    setSelectedId(null);
    setPendingId(null);
    setMovingId(null);
    setGhost(null);
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
    const placed: PlacedFurniture = { id, item, x: spot.x, z: spot.z, r };
    const next = { items: [...current.items, placed] };
    layoutRef.current = next;
    setLayout(next);
    setSelectedId(id);
    setPendingId(id);
    setMovingId(null);
    setGhost({ item, x: spot.x, z: spot.z, r, ok: true });
    setMode('decorate');
  };
  const startMove = () => {
    if (!selected) return;
    const ok = canPlace(layout, selected, {
      ignoreId: selected.id,
      blockedTiles: [avatarTile.current],
    });
    setSelectedId(selected.id);
    setPendingId(selected.id);
    setMovingId(selected.id);
    setGhost({ item: selected.item, x: selected.x, z: selected.z, r: selected.r, ok });
    setMode('decorate');
  };
  const rotate = () => {
    if (!selected) return;
    const r = ((selected.r + 1) % 4) as RoomRotation;
    const candidate = { ...selected, r };
    const ok = canPlace(layout, candidate, {
      ignoreId: selected.id,
      blockedTiles: [avatarTile.current],
    });
    setSelectedId(selected.id);
    setPendingId(selected.id);
    setMovingId(selected.id);
    setGhost({ item: selected.item, x: selected.x, z: selected.z, r, ok });
    setMode('decorate');
  };
  const cancelPending = () => {
    setPendingId(null);
    setMovingId(null);
    setGhost(null);
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
      <header className="my-room-topbar">
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
        <Button
          variant="secondary"
          className="my-room-mode-button"
          onClick={mode === 'walk' ? enterDecorate : exitDecorate}
        >
          {mode === 'walk' ? <Palette size={16} /> : <Check size={16} />}
          <span>{mode === 'walk' ? '꾸미기' : '완료'}</span>
        </Button>
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
          <Button className="my-room-decorate-cta" onClick={enterDecorate}>
            <Palette size={16} />
            <span>방 꾸미기</span>
          </Button>
        </>
      ) : (
        <>
          <div className="my-room-decoration-head" aria-live="polite">
            <span>{ghost ? 'PLACING' : 'DECORATING'}</span>
            <strong>{ghost ? '바닥을 눌러 가구를 놓아요' : '아래에서 가구를 골라 보세요'}</strong>
          </div>
          <section className="my-room-tray" aria-label="가구 목록">
            <div className="my-room-tray-heading">
              <strong>가구</strong>
              {selected && (
                <div className="my-room-selection" role="group" aria-label="선택한 가구">
                  <span className="my-room-selection-name">
                    <span aria-hidden="true">{selectedFurniture?.icon}</span>
                    {selectedFurniture?.name ?? '가구'}
                  </span>
                  {ghost ? (
                    <>
                      <Button variant="secondary" onClick={rotate} aria-label="가구 회전">
                        <RotateCw size={15} />
                        <span>회전</span>
                      </Button>
                      <Button variant="ghost" onClick={cancelPending} aria-label="배치 취소">
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
