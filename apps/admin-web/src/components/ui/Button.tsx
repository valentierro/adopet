import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'success' | 'warning';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-adopet-primary text-white border-transparent hover:bg-adopet-primary-dark focus:ring-adopet-primary/50 shadow-sm',
  secondary:
    'bg-adopet-card text-adopet-text-primary border border-adopet-primary/25 hover:bg-adopet-primary/10 hover:border-adopet-primary/40 focus:ring-adopet-primary/40',
  destructive:
    'bg-red-600 text-white border-transparent hover:bg-red-700 focus:ring-red-500/50 shadow-sm',
  ghost:
    'bg-transparent text-adopet-text-primary border border-transparent hover:bg-adopet-primary/10 focus:ring-adopet-primary/30',
  success:
    'bg-emerald-600 text-white border-transparent hover:bg-emerald-700 focus:ring-emerald-500/50 shadow-sm',
  warning:
    'bg-adopet-orange text-white border-transparent hover:bg-adopet-orange-light focus:ring-adopet-orange/50 shadow-sm',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2.5',
};

const baseClasses =
  'inline-flex items-center justify-center font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim();

  return (
    <button type={type} disabled={disabled || loading} className={classes} {...rest}>
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  );
}

type ButtonLinkProps = LinkProps & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

/** Link styled as a button (same variants/sizes). */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonLinkProps) {
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim();
  return <Link className={classes} {...rest}>{children}</Link>;
}
