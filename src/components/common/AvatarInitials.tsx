import { getInitials } from "@/utils";
import { BRAND } from "@/utils";

interface AvatarInitialsProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
};

export function AvatarInitials({ name, size = "md", className = "" }: AvatarInitialsProps) {
  return (
    <div
      className={`rounded-full flex items-center justify-center flex-shrink-0 font-medium ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: BRAND.primaryLight, color: BRAND.primary }}
    >
      {getInitials(name)}
    </div>
  );
}
