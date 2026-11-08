import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { barDrinks, type BarDrinkId } from '../../data/bar';
import { DialogPanel } from '../ui/Panel';

const englishNames = {
  beer: 'Draft Beer',
  wine: 'Red Wine',
  whisky: 'Whisky',
  mocktail: 'Moonlight Ade',
};
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
      aria-label="문나잇 바 메뉴"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <button className="bar-menu-close" aria-label="메뉴 닫기" onClick={onClose}>
        <X size={16} />
      </button>
      <div className="bar-menu-book">
        {[barDrinks.slice(0, 2), barDrinks.slice(2)].map((drinks, page) => (
          <section
            className="bar-menu-page"
            key={page}
            aria-label={page === 0 ? '클래식 메뉴' : '스페셜 메뉴'}
          >
            <header>
              <small>MOONNIGHT BAR</small>
              <h2>{page === 0 ? 'The Classics' : 'After Dark'}</h2>
            </header>
            <div className="bar-drink-options">
              {drinks.map((drink) => (
                <button
                  key={drink.id}
                  type="button"
                  aria-pressed={selected === drink.id}
                  onClick={() => setSelected(drink.id)}
                >
                  <span className="bar-menu-illustration" aria-hidden="true">
                    {drink.icon}
                  </span>
                  <span className="bar-menu-description">
                    <em>{englishNames[drink.id]}</em>
                    <strong>{drink.name}</strong>
                    <small>{drink.detail}</small>
                  </span>
                  <span className="bar-menu-check" aria-hidden="true">
                    {selected === drink.id ? '✓' : ''}
                  </span>
                </button>
              ))}
            </div>
            <span className="bar-menu-page-number">— {String(page + 1).padStart(2, '0')} —</span>
          </section>
        ))}
      </div>
      <footer className="bar-drink-footer">
        <button type="button" onClick={() => onOrder(selected)}>
          마시기 <span aria-hidden="true">→</span>
        </button>
      </footer>
    </DialogPanel>
  );
}
