import { useEffect, useId, useRef, useState } from 'react';
import { Coffee, Snowflake } from 'lucide-react';
import { coffeeMenu, type CoffeeId } from '../coffeeMenu';
import { Button } from './ui/Button';
import { DialogPanel, PanelHeading } from './ui/Panel';
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
      <div id={title}>
        <PanelHeading title="어떤 커피 마실까요?" onClose={onClose} />
      </div>
      <p className="coffee-order-intro">공원에서 즐기는 무료 커피 한 잔</p>
      <div className="coffee-menu" role="group" aria-label="커피 메뉴">
        {coffeeMenu.map((drink) => (
          <Button
            key={drink.id}
            variant="choice"
            className="coffee-menu-item"
            aria-pressed={selected === drink.id}
            onClick={() => setSelected(drink.id)}
          >
            <Coffee size={26} style={{ color: drink.color }} aria-hidden="true" />
            <span>
              <strong>{drink.name}</strong>
              <small>{drink.detail}</small>
            </span>
            {drink.iced && <Snowflake size={16} aria-label="아이스" />}
          </Button>
        ))}
      </div>
      <div className="coffee-order-actions">
        <Button variant="secondary" data-sound="cancel" onClick={onClose}>
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
