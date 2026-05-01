import { ReactNode } from "react";

interface PhoneFrameProps {
  children: ReactNode;
  label?: string;
}

export function PhoneFrame({ children, label }: PhoneFrameProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {/* Phone body */}
        <div className="w-[320px] h-[660px] rounded-[44px] bg-gradient-to-b from-[oklch(0.08_0.02_260)] to-[oklch(0.05_0.01_260)] p-[10px] shadow-[0_25px_60px_-15px_oklch(0_0_0/80%),0_0_0_2px_oklch(0.30_0.04_260/60%),inset_0_0_0_1px_oklch(0.40_0.05_260/40%)]">
          {/* Screen */}
          <div className="relative w-full h-full rounded-[36px] overflow-hidden bg-background">
            {/* Notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-50 flex items-center justify-end pr-3 gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.30_0.05_260)]" />
            </div>
            {/* Status bar */}
            <div className="absolute top-0 left-0 right-0 h-9 z-40 flex items-center justify-between px-6 text-[10px] font-semibold text-foreground">
              <span>9:41</span>
              <span className="opacity-0">.</span>
              <span className="flex items-center gap-1">
                <span>●●●●</span>
              </span>
            </div>
            {/* Content */}
            <div className="absolute inset-0 pt-9 overflow-y-auto scrollbar-thin">
              {children}
            </div>
          </div>
        </div>
      </div>
      {label && (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{label}</p>
      )}
    </div>
  );
}
