import { SidebarNav } from "./SidebarNav";

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-screen sticky top-0">
      <SidebarNav />
    </aside>
  );
}
