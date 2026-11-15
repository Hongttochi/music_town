import './my-room.css';
import { useState, type CSSProperties } from 'react';
import { roomCatalog } from '../../data/roomCatalog';
import { roomThemes } from '../../data/roomThemes';
import { readSaved } from '../../utils/storage';
import {
  MAX_ROOM_ITEMS,
  ROOM_SIZE,
  canPlace,
  footprintTiles,
  getRoomItem,
  parseSavedRoom,
  rotatedFootprint,
} from '../../utils/roomLayout';
import type { PlacedRoomItem, RoomItemId, RoomLayout, RoomRotation } from '../../types/room';

type Notice = { text: string; error: boolean };

let itemSequence = 0;

function nextItemId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  itemSequence += 1;
  return `room-item-${Date.now().toString(36)}-${itemSequence}`;
}

export function MyRoom({ storageKey }: { storageKey: string }) {
  const [initial] = useState<RoomLayout>(() => parseSavedRoom(readSaved(storageKey, null)));
  const [saved, setSaved] = useState<RoomLayout>(initial);
  const [layout, setLayout] = useState<RoomLayout>(initial);
  const [trayItem, setTrayItem] = useState<RoomItemId | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [notice, setNotice] = useState<Notice>({ text: '', error: false });

  const theme = roomThemes.find((entry) => entry.id === layout.theme) ?? roomThemes[0];
  const selected = layout.items.find((item) => item.id === selectedId) ?? null;
  const selectedDefinition = selected ? getRoomItem(selected.item) : undefined;

  const say = (text: string, error = false) => setNotice({ text, error });

  const replaceItem = (item: PlacedRoomItem) =>
    setLayout((current) => ({
      ...current,
      items: current.items.map((entry) => (entry.id === item.id ? item : entry)),
    }));

  const itemAt = (x: number, z: number) => {
    const hits = layout.items.filter((item) =>
      footprintTiles(item.item, item.x, item.z, item.r).some(
        (tile) => tile.x === x && tile.z === z,
      ),
    );
    return [...hits].reverse().find((item) => item.item !== 'rug') ?? hits.at(-1) ?? null;
  };

  const tapTile = (x: number, z: number) => {
    if (moving && selected) {
      const candidate: PlacedRoomItem = { ...selected, x, z };
      if (!canPlace(layout, candidate, selected.id)) {
        say('여기로는 옮길 수 없어요.', true);
        return;
      }
      replaceItem(candidate);
      setMoving(false);
      say('아이템을 옮겼어요.');
      return;
    }

    if (trayItem) {
      if (layout.items.length >= MAX_ROOM_ITEMS) {
        say(`아이템은 ${MAX_ROOM_ITEMS}개까지 놓을 수 있어요.`, true);
        return;
      }
      const candidate: PlacedRoomItem = {
        id: nextItemId(),
        item: trayItem,
        x,
        z,
        r: 0,
      };
      if (!canPlace(layout, candidate)) {
        say('여기에 놓을 수 없어요. 다른 타일을 골라 주세요.', true);
        return;
      }
      setLayout((current) => ({ ...current, items: [...current.items, candidate] }));
      setSelectedId(candidate.id);
      setTrayItem(null);
      say(`${getRoomItem(trayItem)?.name ?? '아이템'}을(를) 놓았어요.`);
      return;
    }

    setSelectedId(itemAt(x, z)?.id ?? null);
    setMoving(false);
    setNotice({ text: '', error: false });
  };

  const selectPlaced = (item: PlacedRoomItem) => {
    setSelectedId(item.id);
    setMoving(false);
    setTrayItem(null);
    setNotice({ text: '', error: false });
  };

  const rotateSelected = () => {
    if (!selected) return;
    const r = ((selected.r + 1) % 4) as RoomRotation;
    const candidate: PlacedRoomItem = { ...selected, r };
    if (!canPlace(layout, candidate, selected.id)) {
      say('회전할 공간이 부족해요.', true);
      return;
    }
    replaceItem(candidate);
    say('90° 회전했어요.');
  };

  const toggleMove = () => {
    if (!selected) return;
    setTrayItem(null);
    setMoving((current) => !current);
    say(moving ? '' : '옮길 타일을 눌러 주세요.');
  };

  const removeSelected = () => {
    if (!selected) return;
    setLayout((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== selected.id),
    }));
    setSelectedId(null);
    setMoving(false);
    say('아이템을 치웠어요.');
  };

  const save = () => {
    // Supabase persistence (member_rooms table + RPC) is deferred to a follow-up issue.
    try {
      localStorage.setItem(storageKey, JSON.stringify(layout));
      setSaved(layout);
      say('마이룸을 저장했어요.');
    } catch {
      say('저장하지 못했어요. 다시 시도해 주세요.', true);
    }
  };

  const reset = () => {
    setLayout(saved);
    setSelectedId(null);
    setTrayItem(null);
    setMoving(false);
    say('마지막 저장 상태로 되돌렸어요.');
  };

  const boardStyle = {
    '--room-floor': theme.floor,
    '--room-floor-alt': theme.floorAlt,
    '--room-wall': theme.wall,
    '--room-accent': theme.accent,
  } as CSSProperties;

  return (
    <div className="my-room">
      <div className="my-room-stage">
        <div
          className="room-board"
          style={boardStyle}
          data-editing={Boolean(trayItem || moving)}
          role="group"
          aria-label="8x8 마이룸 타일"
        >
          {Array.from({ length: ROOM_SIZE * ROOM_SIZE }, (_, index) => {
            const x = index % ROOM_SIZE;
            const z = Math.floor(index / ROOM_SIZE);
            return (
              <button
                key={`${x}-${z}`}
                type="button"
                className="room-tile"
                data-alt={(x + z) % 2 === 1}
                onClick={() => tapTile(x, z)}
                aria-label={`${x + 1}열 ${z + 1}행 타일`}
              />
            );
          })}
          {layout.items.map((item) => {
            const definition = getRoomItem(item.item);
            if (!definition) return null;
            const { width, depth } = rotatedFootprint(item.item, item.r);
            const isRug = item.item === 'rug';
            const style: CSSProperties = {
              left: `${(item.x / ROOM_SIZE) * 100}%`,
              top: `${(item.z / ROOM_SIZE) * 100}%`,
              width: `${(width / ROOM_SIZE) * 100}%`,
              height: `${(depth / ROOM_SIZE) * 100}%`,
              zIndex: item.id === selectedId ? 4 : isRug ? 1 : 2,
            };
            return (
              <button
                key={item.id}
                type="button"
                className="room-item"
                data-rug={isRug}
                data-selected={item.id === selectedId}
                style={style}
                onClick={() => selectPlaced(item)}
                aria-pressed={item.id === selectedId}
                aria-label={`${definition.name} 선택`}
              >
                <span className="room-item-emoji" aria-hidden="true">
                  {definition.emoji}
                </span>
                <span className="room-item-name">{definition.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="my-room-controls">
        <div>
          <h3 className="room-section-title">테마</h3>
          <div className="room-themes" role="group" aria-label="방 테마">
            {roomThemes.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="room-theme town-button town-button--choice town-button--sm"
                aria-pressed={layout.theme === entry.id}
                aria-label={entry.label}
                title={entry.label}
                onClick={() => {
                  setLayout((current) => ({ ...current, theme: entry.id }));
                  say('');
                }}
              >
                <span
                  className="room-theme-swatch"
                  style={{
                    background: `linear-gradient(135deg, ${entry.floor} 50%, ${entry.wall} 50%)`,
                  }}
                  aria-hidden="true"
                />
                <span className="room-theme-label">{entry.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="room-section-title">
            아이템{' '}
            <span className="room-count">
              {layout.items.length}/{MAX_ROOM_ITEMS}
            </span>
          </h3>
          <div className="room-tray" role="group" aria-label="아이템 트레이">
            {roomCatalog.map((item) => {
              const footprint = rotatedFootprint(item.id, 0);
              return (
                <button
                  key={item.id}
                  type="button"
                  className="room-tray-item town-button town-button--choice town-button--sm"
                  aria-pressed={trayItem === item.id}
                  onClick={() => {
                    setTrayItem(item.id);
                    setSelectedId(null);
                    setMoving(false);
                    say(`${item.name}을(를) 놓을 타일을 눌러 주세요.`);
                  }}
                >
                  <span className="room-tray-emoji" aria-hidden="true">
                    {item.emoji}
                  </span>
                  <span className="room-tray-name">{item.name}</span>
                  <small>
                    {footprint.width}×{footprint.depth}
                  </small>
                </button>
              );
            })}
          </div>
        </div>

        {selected && selectedDefinition ? (
          <div className="room-item-actions">
            <span className="room-selected-label">
              <strong>{selectedDefinition.name}</strong> 선택됨
            </span>
            <div className="room-action-row">
              <button
                type="button"
                className="room-action town-button town-button--secondary"
                onClick={rotateSelected}
              >
                회전
              </button>
              <button
                type="button"
                className="room-action town-button town-button--secondary"
                aria-pressed={moving}
                onClick={toggleMove}
              >
                이동
              </button>
              <button
                type="button"
                className="room-action town-button town-button--secondary"
                onClick={removeSelected}
              >
                치우기
              </button>
            </div>
          </div>
        ) : (
          <p className="room-hint">
            {trayItem
              ? '놓을 타일을 눌러 주세요.'
              : '아이템을 고르거나, 놓인 아이템을 눌러 보세요.'}
          </p>
        )}

        <div className="room-footer">
          <p className="room-status" data-error={notice.error} role="status">
            {notice.text}
          </p>

          <div className="room-save-row">
            <button type="button" className="town-button town-button--primary" onClick={save}>
              저장
            </button>
            <button type="button" className="town-button town-button--secondary" onClick={reset}>
              되돌리기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
