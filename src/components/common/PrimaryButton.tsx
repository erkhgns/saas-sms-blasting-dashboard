import { BRAND } from "@/utils";

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function PrimaryButton({ children, className = "", style, ...props }: PrimaryButtonProps) {
  return (
    <button
      {...props}
      className={`flex items-center gap-2 px-5 py-2.5 text-white font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      style={{ backgroundColor: BRAND.primary, ...style }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = BRAND.primaryHover;
        props.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = BRAND.primary;
        props.onMouseLeave?.(e);
      }}
    >
      {children}
    </button>
  );
}
