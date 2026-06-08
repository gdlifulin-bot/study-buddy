/**
 * 通用按钮组件
 * variant: primary (黑底白字) | secondary (白底黑字带边框) | text (纯文字)
 */

export default function Button({
  variant = 'primary',
  onClick,
  disabled = false,
  className = '',
  children,
  type = 'button'
}) {
  const base = 'inline-flex items-center justify-center rounded-apple px-5 py-2.5 text-sm font-medium transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed min-w-[80px]';

  const variants = {
    primary: 'bg-apple-black text-white hover:bg-gray-800 active:bg-black',
    secondary: 'bg-white text-apple-black border border-apple-border hover:bg-apple-light active:bg-gray-100',
    text: 'text-apple-black hover:text-apple-gray px-2 min-w-0'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
