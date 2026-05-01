import logo from "@/assets/logo-patio-legal.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizes = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
  xl: "h-24 w-24",
};

export function Logo({ className, showText = true, size = "md" }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src={logo}
        alt="Pátio Legal Maringá SAT"
        className={cn(sizes[size], "object-contain drop-shadow-[0_0_12px_oklch(0.80_0.14_85/30%)]")}
      />
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-foreground tracking-wider text-sm">PÁTIO LEGAL</span>
          <span className="font-semibold text-gold text-[10px] tracking-[0.2em] uppercase">
            Maringá SAT
          </span>
        </div>
      )}
    </div>
  );
}
