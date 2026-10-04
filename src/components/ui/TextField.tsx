import { forwardRef } from 'react';

interface TextFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
  eyebrow?: string;
  className?: string;
  centered?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(
    { eyebrow, className = '', centered = false, ...props },
    ref,
  ) {
    return (
      <label className="block">
        {eyebrow && <span className="label-eyebrow">{eyebrow}</span>}
        <input
          ref={ref}
          {...props}
          className={`${centered ? 'field' : 'field-flat'} ${eyebrow ? 'mt-1' : ''} ${className}`}
        />
      </label>
    );
  },
);
