import { useEffect, useId, useRef, useState } from 'react';
import { coffeeMenu, type CoffeeId } from '../../data/coffeeMenu';
import { Button } from '../ui/Button';
import { Check, X } from 'lucide-react';
import { DialogPanel } from '../ui/Panel';
import './coffee-order.css';

export function CoffeeOrderDialog({
  onClose,
  onOrder,
}: {
  onClose: () => void;
  onOrder: (id: CoffeeId) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const [selected, setSelected] = useState<CoffeeId>('americano');
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <DialogPanel
      ref={dialog}
      className="coffee-order-dialog"
      aria-labelledby={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="coffee-menu-heading">
        <div className="park-coffee-brand">
          <img src="/art/park-coffee-face.png" width={40} height={40} alt="" />
          <p>PARK COFFEE</p>
        </div>
        <h2 id={title}>Coffee Menu</h2>
        <Button
          className="coffee-menu-close"
          variant="ghost"
          size="icon"
          aria-label="닫기"
          onClick={onClose}
        >
          <X size={18} aria-hidden="true" />
        </Button>
      </header>
      <div className="coffee-menu" role="group" aria-label="커피 메뉴">
        {coffeeMenu.map((drink) => (
          <Button
            key={drink.id}
            variant="choice"
            className="coffee-menu-item"
            aria-pressed={selected === drink.id}
            onClick={() => setSelected(drink.id)}
          >
            <img
              className="coffee-menu-icon"
              src={drink.icon}
              width={36}
              height={36}
              alt=""
              aria-hidden="true"
            />
            <span className="coffee-menu-description">
              <span className="coffee-menu-english">{drink.menuName}</span>
              <strong>{drink.name}</strong>
              <small>{drink.detail}</small>
            </span>
            <span className="coffee-selection-mark" aria-hidden="true">
              {selected === drink.id && <Check size={14} strokeWidth={1.5} />}
            </span>
          </Button>
        ))}
      </div>
      <div className="coffee-order-actions">
        <Button variant="ghost" data-sound="cancel" onClick={onClose}>
          취소
        </Button>
        <Button
          variant="primary"
          data-sound="ok"
          onClick={() => {
            dialog.current?.close();
            onOrder(selected);
          }}
        >
          주문하기
        </Button>
      </div>
    </DialogPanel>
  );
}
