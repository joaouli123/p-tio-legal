import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
}

export function PageHeader({ title, description, actions, eyebrow }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border">
      <div>
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold mb-2">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="w-full md:w-auto flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-start md:justify-end gap-2">{actions}</div>}
    </div>
  );
}
