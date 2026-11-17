import type { CSSProperties } from 'react';

// Props for the staggered rise-in animation; `order` sets the delay step.
export const reveal = (order: number) => ({
  className: 'rv',
  style: { '--i': order } as CSSProperties,
});
