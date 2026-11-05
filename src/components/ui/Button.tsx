import { forwardRef, type ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'choice' | 'plain';
type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'icon';
};

/** Shared interaction, sizing and focus treatment for all town controls. */
export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'plain', size = 'sm', className = '', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`town-button town-button--${variant} town-button--${size} ${className}`}
      {...props}
    />
  );
});
