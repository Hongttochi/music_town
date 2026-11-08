import { useEffect, useRef, useState } from 'react';
import { barDrinks, type BarDrinkId } from '../../data/bar';
import { DialogPanel, PanelHeading } from '../ui/Panel';
import { Button } from '../ui/Button';
export function BarDrinkDialog({
  onClose,
  onOrder,
}: {
  onClose: () => void;
  onOrder: (id: BarDrinkId) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<BarDrinkId>('beer');
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <DialogPanel
      ref={ref}
      className="bar-drink-menu"
      aria-label="달빛 바 메뉴"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <PanelHeading title="MOONLIGHT BAR · 한 잔 고르기" onClose={onClose} />
      <div className="bar-drink-options">
        {barDrinks.map((drink) => (
          <Button
            key={drink.id}
            variant="choice"
            aria-pressed={selected === drink.id}
            onClick={() => setSelected(drink.id)}
          >
            <span aria-hidden="true">{drink.icon}</span>
            <span>
              <strong>{drink.name}</strong>
              <small>{drink.detail}</small>
            </span>
          </Button>
        ))}
      </div>
      <div className="bar-drink-footer">
        <Button variant="primary" onClick={() => onOrder(selected)}>
          마시기
        </Button>
      </div>
    </DialogPanel>
  );
}
