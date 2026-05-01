import { cn } from "@/lib/utils";

type Status =
  | "no-patio"
  | "em-analise"
  | "destruido"
  | "restituido"
  | "leilao"
  | "doacao"
  | "aguardando";

const map: Record<Status, { label: string; className: string }> = {
  "no-patio": { label: "No pátio", className: "bg-info/15 text-info border-info/30" },
  "em-analise": { label: "Em análise", className: "bg-warning/15 text-warning border-warning/30" },
  destruido: { label: "Destruído", className: "bg-destructive/15 text-destructive border-destructive/30" },
  restituido: { label: "Restituído", className: "bg-success/15 text-success border-success/30" },
  leilao: { label: "Leilão", className: "bg-gold/15 text-gold border-gold/30" },
  doacao: { label: "Doação", className: "bg-chart-5/15 text-chart-5 border-chart-5/30" },
  aguardando: { label: "Aguardando decisão", className: "bg-muted text-muted-foreground border-border" },
};

export function StatusBadge({ status }: { status: Status }) {
  const s = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border whitespace-nowrap",
        s.className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}
