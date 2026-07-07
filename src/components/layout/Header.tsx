import { Bell, Search, Menu, LogOut, User, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getCurrentProfile, getUserRoleLabel } from "@/lib/db";
import { SidebarNav } from "./SidebarNav";
import { supabase } from "@/lib/supabase";

export function Header() {
  const [open, setOpen] = useState(false);
  const [userName, setUserName] = useState("Usuário");
  const [userInitials, setUserInitials] = useState("U");
  const [userRole, setUserRole] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const navigate = useNavigate();

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = globalSearch.trim();
    if (!term) return;
    navigate({ to: "/veiculos", search: { q: term } as never });
  };

  useEffect(() => {
    Promise.all([supabase.auth.getUser(), getCurrentProfile()]).then(([{ data: { user } }, profile]) => {
      if (!user) return;
      const nome = profile?.nome ?? user.user_metadata?.nome ?? user.email?.split("@")[0] ?? "Usuário";
      const cargo = getUserRoleLabel(profile?.cargo);
      setUserName(nome);
      setUserRole(cargo);
      const parts = nome.split(" ");
      setUserInitials(parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : nome.slice(0, 2).toUpperCase()
      );
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="h-full px-3 sm:px-4 lg:px-8 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-xl min-w-0">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden shrink-0" aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 bg-sidebar border-sidebar-border flex flex-col">
              <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
              <SheetDescription className="sr-only">Navegação principal do sistema</SheetDescription>
              <SidebarNav onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <form onSubmit={handleGlobalSearch} className="relative flex-1 min-w-0" role="search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Buscar veículo, processo, chassi…"
              aria-label="Buscar veículo, processo ou chassi"
              className="pl-10 bg-muted/40 border-border focus-visible:ring-gold"
            />
          </form>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Badge variant="outline" className="hidden md:flex border-gold-subtle text-gold gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Maringá - PR
          </Badge>

          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-gold animate-pulse-gold" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2 h-10 hover:bg-muted/50">
                <Avatar className="h-8 w-8 border border-gold-subtle">
                  <AvatarFallback className="bg-gradient-gold text-primary-foreground font-semibold text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start leading-tight">
                  <span className="text-sm font-semibold">{userName}</span>
                  <span className="text-[11px] text-muted-foreground">{userRole || "Pátio Legal SAT"}</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-card border-border">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-sm">{userName}</span>
                  <span className="text-xs text-muted-foreground">{userRole}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={() => navigate({ to: "/perfil" })}
                className="gap-2 cursor-pointer hover:text-gold focus:text-gold"
              >
                <User className="h-4 w-4" />
                Meu perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="gap-2 cursor-pointer text-destructive hover:text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Sair da conta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
