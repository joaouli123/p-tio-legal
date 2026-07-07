import { PLATE_STATUS_LABELS, type PlateStatus } from '@/lib/plate-status';

const PLATE_STATUS_STYLES: Record<PlateStatus, string> = {
  regular: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  em_verificacao: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  divergente: 'border-destructive/30 bg-destructive/10 text-destructive',
  suspeita_adulteracao: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
};

export function PlateStatusBadge({ status, compact = false }: { status: PlateStatus; compact?: boolean }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border font-medium',
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        PLATE_STATUS_STYLES[status],
      ].join(' ')}
    >
      {PLATE_STATUS_LABELS[status]}
    </span>
  );
}