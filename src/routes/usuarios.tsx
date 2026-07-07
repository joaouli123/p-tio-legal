import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, ShieldCheck, Loader2, UserRoundCheck } from "lucide-react";
import { canAccessAdminArea, formatProfileAccessLabel, getCurrentProfile, getProfiles, getUserRoleLabel, normalizeUserRole, type AccessScopeType, type EffectiveUserRole, type Profile, type UserRole } from "@/lib/db";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/usuarios")({
  beforeLoad: async () => {
    const profile = await getCurrentProfile();
    if (!profile) throw redirect({ to: "/login" });
    if (!canAccessAdminArea(profile.cargo)) throw redirect({ to: "/" });
  },
  component: UsuariosPage,
  head: () => ({ meta: [{ title: "Usuários — Pátio Legal" }] }),
});

interface DelegaciaOption {
  nome: string;
  cidade: string;
  tipo: string;
}

const ROLE_ICONS: Record<EffectiveUserRole, any> = {
  admin: ShieldCheck,
  delegado: UserRoundCheck,
};

const ROLE_COLORS: Record<EffectiveUserRole, string> = {
  admin: "gold",
  delegado: "warning",
};

const SCOPE_LABELS: Record<AccessScopeType, string> = {
  delegacia: "Delegacia",
  cidade: "Cidade",
  tipo: "Tipo de unidade",
};

const UNIT_TYPE_LABELS: Record<string, string> = {
  delegacia: "Delegacia",
  forum: "Fórum",
  orgao_especial: "Órgão especial",
  vara_criminal: "Vara criminal",
  denarc: "DENARC",
  deic: "DEIC",
  outro: "Outro",
};

function getAllowedScopeTypes(role: UserRole) {
  if (role === "admin") return [] as AccessScopeType[];
  return ["delegacia", "cidade", "tipo"] as AccessScopeType[];
}

function buildScopeOptions(delegacias: DelegaciaOption[], scopeType: AccessScopeType) {
  if (scopeType === "delegacia") {
    return delegacias.map((item) => ({ value: item.nome, label: item.nome }));
  }

  if (scopeType === "cidade") {
    return Array.from(new Set(delegacias.map((item) => item.cidade).filter(Boolean)))
      .sort((left, right) => left.localeCompare(right, "pt-BR"))
      .map((value) => ({ value, label: value }));
  }

  return Array.from(new Set(delegacias.map((item) => item.tipo).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right, "pt-BR"))
    .map((value) => ({ value, label: UNIT_TYPE_LABELS[value] ?? value }));
}

function isMissingScopeColumnError(error: { message?: string; details?: string; hint?: string } | null) {
  const text = [error?.message, error?.details, error?.hint].filter(Boolean).join(" ").toUpperCase();
  return text.includes("ESCOPO") && (text.includes("COLUMN") || text.includes("SCHEMA CACHE"));
}

function initials(nome: string) {
  const parts = nome.split(" ");
  return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : nome.slice(0, 2).toUpperCase();
}

function NovoUsuarioDialog({ open, onClose, onSaved, delegacias }: { open: boolean; onClose: () => void; onSaved: () => void; delegacias: DelegaciaOption[] }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [matricula, setMatricula] = useState("");
  const [cargo, setCargo] = useState<UserRole>("delegado");
  const [scopeType, setScopeType] = useState<AccessScopeType>("delegacia");
  const [scopeValue, setScopeValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const allowedScopeTypes = useMemo(() => getAllowedScopeTypes(cargo), [cargo]);
  const scopeOptions = useMemo(() => buildScopeOptions(delegacias, scopeType), [delegacias, scopeType]);

  useEffect(() => {
    if (!open) return;
    setNome("");
    setEmail("");
    setSenha("");
    setMatricula("");
    setCargo("delegado");
    setScopeType("delegacia");
    setScopeValue("");
    setError("");
  }, [open]);

  useEffect(() => {
    if (cargo === "admin") {
      setScopeValue("");
      return;
    }

    if (!allowedScopeTypes.includes(scopeType)) {
      setScopeType(allowedScopeTypes[0]);
      return;
    }

    const optionValues = scopeOptions.map((option) => option.value);
    if (optionValues.length === 0) {
      setScopeValue("");
      return;
    }

    if (!optionValues.includes(scopeValue)) {
      setScopeValue(optionValues[0]);
    }
  }, [allowedScopeTypes, cargo, scopeOptions, scopeType, scopeValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !email || !senha) { setError("Preencha todos os campos."); return; }
    if (cargo !== "admin" && !scopeValue) { setError("Selecione o escopo de acesso do usuário."); return; }
    setSaving(true); setError("");
    try {
      const escopoTipo = cargo === "admin" ? null : scopeType;
      const escopoValor = cargo === "admin" ? null : scopeValue;
      const delegacia = escopoTipo === "delegacia" ? escopoValor : null;

      const { data, error: err } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            nome,
            cargo,
            matricula: matricula || undefined,
            delegacia: delegacia ?? undefined,
            escopo_tipo: escopoTipo ?? undefined,
            escopo_valor: escopoValor ?? undefined,
          },
        },
      });
      if (err) throw err;

      if (data.user?.id) {
        const fullPayload = {
          id: data.user.id,
          nome,
          cargo,
          delegacia,
          escopo_tipo: escopoTipo,
          escopo_valor: escopoValor,
          matricula: matricula || null,
          ativo: true,
        };

        let { error: profileError } = await supabase.from("profiles").upsert(fullPayload);

        if (profileError && isMissingScopeColumnError(profileError)) {
          const fallbackPayload = {
            id: data.user.id,
            nome,
            cargo,
            delegacia,
            matricula: matricula || null,
            ativo: true,
          };

          profileError = (await supabase.from("profiles").upsert(fallbackPayload)).error;
        }

        if (profileError) throw profileError;
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Erro ao criar usuário.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
          <DialogDescription>
            Defina cargo, escopo e credenciais iniciais para liberar o acesso institucional.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Nome completo</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="João Silva" className="bg-muted/40" />
          </div>
          <div className="space-y-1">
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="joao@email.com" className="bg-muted/40" />
          </div>
          <div className="space-y-1">
            <Label>Senha inicial</Label>
            <Input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" className="bg-muted/40" />
          </div>
          <div className="space-y-1">
            <Label>Matrícula</Label>
            <Input value={matricula} onChange={e => setMatricula(e.target.value)} placeholder="Opcional" className="bg-muted/40" />
          </div>
          <div className="space-y-1">
            <Label>Cargo</Label>
            <Select value={cargo} onValueChange={(value) => setCargo(value as UserRole)}>
              <SelectTrigger className="bg-muted/40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="delegado">Delegado</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {cargo !== "admin" && (
            <>
              <div className="space-y-1">
                <Label>Tipo de escopo</Label>
                <Select value={scopeType} onValueChange={(value) => setScopeType(value as AccessScopeType)}>
                  <SelectTrigger className="bg-muted/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allowedScopeTypes.map((type) => (
                      <SelectItem key={type} value={type}>{SCOPE_LABELS[type]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Escopo de acesso</Label>
                <Select value={scopeValue} onValueChange={setScopeValue} disabled={scopeOptions.length === 0}>
                  <SelectTrigger className="bg-muted/40"><SelectValue placeholder="Selecione o escopo" /></SelectTrigger>
                  <SelectContent>
                    {scopeOptions.map((option) => (
                      <SelectItem key={`${scopeType}-${option.value}`} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Delegados podem ser vinculados por delegacia, cidade ou tipo de unidade, sempre com visão operacional dentro do escopo definido.
                </p>
              </div>
            </>
          )}
          {error && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-border">Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold gap-2">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Criando…</> : <><Plus className="h-4 w-4" /> Criar usuário</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UsuariosPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [delegacias, setDelegacias] = useState<DelegaciaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    setLoading(true);
    getProfiles().then(setProfiles).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    supabase
      .from("delegacias")
      .select("nome, cidade, tipo")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => {
        if (data) setDelegacias(data as DelegaciaOption[]);
      });
  }, []);

  const counts = { admin: 0, delegado: 0 };
  profiles.forEach((profile) => {
    counts[normalizeUserRole(profile.cargo)] += 1;
  });

  return (
    <>
      <NovoUsuarioDialog open={showForm} onClose={() => setShowForm(false)} onSaved={load} delegacias={delegacias} />
      <PageHeader
        eyebrow="Controle de acesso (RBAC)"
        title="Usuários e permissões"
        description="O sistema passa a operar com dois perfis: Administrador e Delegado. O delegado enxerga apenas a operação dentro do escopo vinculado e não acessa telas administrativas."
        actions={
          <Button onClick={() => setShowForm(true)} className="gap-2 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold">
            <Plus className="h-4 w-4" /> Novo usuário
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { l: "Administradores", v: counts.admin, c: "gold" },
          { l: "Delegados", v: counts.delegado, c: "warning" },
        ].map((s) => (
          <div key={s.l} className="rounded-xl bg-gradient-card border border-border p-5 shadow-elegant">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.l}</p>
            <p className={`text-3xl font-bold mt-1 text-${s.c}`}>{s.v}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-gradient-card border border-border shadow-elegant overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-lg">Equipe ativa</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Carregando usuários…</span>
          </div>
        ) : profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <p className="font-medium">Nenhum usuário cadastrado</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {profiles.map((u) => {
              const effectiveRole = normalizeUserRole(u.cargo);
              const Icon = ROLE_ICONS[effectiveRole];
              const color = ROLE_COLORS[effectiveRole];
              const scopeLabel = formatProfileAccessLabel(u);

              return (
                <div key={u.id} className="flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors">
                  <Avatar className="h-11 w-11 border border-gold-subtle">
                    <AvatarFallback className="bg-gradient-gold text-primary-foreground font-semibold">
                      {initials(u.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{u.nome}</p>
                    {scopeLabel && <p className="text-xs text-muted-foreground truncate">{scopeLabel}</p>}
                    {u.matricula && <p className="text-xs text-muted-foreground">Mat. {u.matricula}</p>}
                  </div>
                  <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border bg-${color}/15 border-${color}/30 text-${color} text-xs font-semibold`}>
                    <Icon className="h-3.5 w-3.5" />
                    {getUserRoleLabel(u.cargo)}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${u.ativo ? "text-success" : "text-muted-foreground"}`}>
                    {u.ativo ? "Ativo" : "Inativo"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

