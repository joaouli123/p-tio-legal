import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-4 lg:p-8 space-y-6">{children}</main>
        <footer className="px-4 lg:px-8 py-5 border-t border-border text-xs text-muted-foreground flex flex-wrap justify-between gap-2">
          <span>© 2026 Pátio Legal Maringá SAT — Prestadora de serviços em veículos LTDA.</span>
          <span className="text-gold">v1.0.0 • Sistema 100% digital e auditável</span>
        </footer>
      </div>
    </div>
  );
}
