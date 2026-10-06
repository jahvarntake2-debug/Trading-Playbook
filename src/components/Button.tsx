import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'quiet' | 'destructive' | 'nav';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  active?: boolean;
};

type FileButtonProps = {
  children: ReactNode;
  className?: string;
  variant?: Exclude<ButtonVariant, 'nav'>;
  size?: ButtonSize;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'button--primary',
  secondary: 'button--secondary',
  outline: 'button--outline',
  quiet: 'button--quiet',
  destructive: 'button--destructive',
  nav: 'button--nav',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'button--sm',
  md: 'button--md',
  lg: 'button--lg',
};

function joinClasses(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(' ');
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', active = false, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={joinClasses('button', variantClasses[variant], sizeClasses[size], active && 'button--nav-active', className)}
      {...props}
    />
  );
});

export function FileButton({ children, className, variant = 'outline', size = 'md', inputProps }: FileButtonProps) {
  return (
    <label className={joinClasses('button', 'button--file', variantClasses[variant], sizeClasses[size], className)}>
      {children}
      <input {...inputProps} type="file" className="sr-only" />
    </label>
  );
}
