import logo from "@/assets/logo-patio-legal.png";
import logoMark from "@/assets/logo-patio-legal-mark.png";
import logoHorizontal from "@/assets/logo-patio-legal-horizontal.png";
import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: LogoSize;
  /** Usa a logo completa (escudo + texto empilhado) com fundo transparente, sem borda ou sombra. */
  mark?: boolean;
  /** Usa a logo completa com escudo e texto lado a lado (fundo transparente), ideal para espaços baixos e largos como o sidebar. */
  horizontal?: boolean;
}

const sizes: Record<string, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
  xl: "h-24 w-24",
};

const markSizes: Record<string, string> = {
  sm: "h-9",
  md: "h-12",
  lg: "h-16",
  xl: "h-24",
  "2xl": "h-32",
  "3xl": "h-44",
};

export function Logo({ className, showText = true, size = "md", mark = false, horizontal = false }: LogoProps) {
  if (horizontal) {
    return (
      <img
        src={logoHorizontal}
        alt="Pátio Legal Maringá SAT"
        className={cn(markSizes[size] ?? markSizes.md, "w-auto object-contain select-none", className)}
      />
    );
  }

  if (mark) {
    return (
      <img
        src={logoMark}
        alt="Pátio Legal Maringá SAT"
        className={cn(markSizes[size] ?? markSizes.md, "w-auto object-contain select-none", className)}
      />
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src={logo}
        alt="Pátio Legal Maringá SAT"
        className={cn(sizes[size] ?? sizes.md, "object-contain drop-shadow-[0_0_12px_oklch(0.80_0.14_85/30%)]")}
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
