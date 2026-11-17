import './toast.css';

// Brief notice at the bottom of the screen. A new `stamp` replays it.
export function Toast({ text, stamp }: { text: string; stamp: number }) {
  return (
    <div className="a-toast" role="status" key={stamp}>
      {text}
    </div>
  );
}
