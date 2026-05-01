import { Bell, Search, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="h-full px-4 lg:px-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar veículo, processo, chassi…"
              className="pl-10 bg-muted/40 border-border focus-visible:ring-gold"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="hidden md:flex border-gold-subtle text-gold gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Maringá - PR
          </Badge>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-gold animate-pulse-gold" />
          </Button>
          <div className="flex items-center gap-2">
            <Avatar className="h-9 w-9 border border-gold-subtle">
              <AvatarFallback className="bg-gradient-gold text-primary-foreground font-semibold text-sm">
                MA
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col leading-tight">
              <span className="text-sm font-semibold">Master Admin</span>
              <span className="text-[11px] text-muted-foreground">Pátio Legal SAT</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
