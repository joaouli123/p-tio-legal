import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Building2, Plus, Loader2, Pencil, Trash2, LayoutGrid, List, Phone, Mail, User, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { canAccessAdminArea, getCurrentProfile } from "@/lib/db";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/unidades")({
  beforeLoad: async () => {
    const profile = await getCurrentProfile();
    if (!profile) throw redirect({ to: "/login" });
    if (!canAccessAdminArea(profile.cargo)) throw redirect({ to: "/" });
  },
  component: UnidadesPage,
  head: () => ({ meta: [{ title: "Unidades — Pátio Legal" }] }),
});

interface Delegacia {
  id: string;
  nome: string;
  tipo: string;
  cidade: string;
  uf: string;
  endereco?: string;
  telefone?: string;
  responsavel?: string;
  email?: string;
  ativo: boolean;
  created_at: string;
}

const EMPTY: Omit<Delegacia, "id" | "created_at"> = {
  nome: "", tipo: "delegacia", cidade: "Maringá", uf: "PR",
  endereco: "", telefone: "", responsavel: "", email: "", ativo: true,
};

const TIPO_LABELS: Record<string, string> = {
  delegacia: "Delegacia", forum: "Fórum", orgao_especial: "Órgão Especial",
  vara_criminal: "Vara Criminal", denarc: "DENARC", deic: "DEIC", outro: "Outro",
};

function UnidadeForm({
  open, onClose, onSaved, initial,
}: {
  open: boolean; onClose: () => void; onSaved: () => void; initial?: Delegacia | null;
}) {
  const [form, setForm] = useState<Omit<Delegacia, "id" | "created_at">>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) setForm(initial ? { ...initial } : { ...EMPTY });
    setError("");
  }, [open, initial]);

  const set = (k: keyof typeof EMPTY, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome) { setError("Nome é obrigatório."); return; }
    setSaving(true); setError("");
    try {
      if (initial) {
        const { error: err } = await supabase.from("delegacias").update(form).eq("id", initial.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from("delegacias").insert(form);
        if (err) throw err;
      }
      onSaved(); onClose();
    } catch (err: any) {
      setError(err.message ?? "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar unidade" : "Nova unidade"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2">
              <Label>Nome <span className="text-destructive">*</span></Label>
              <Input value={form.nome} onChange={e => set("nome", e.target.value)} placeholder="15ª SDP Maringá" className="bg-muted/40" />
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => set("tipo", v)}>
                <SelectTrigger className="bg-muted/40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>UF</Label>
              <Input value={form.uf} onChange={e => set("uf", e.target.value.toUpperCase())} placeholder="PR" maxLength={2} className="bg-muted/40 uppercase" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Cidade</Label>
              <Input value={form.cidade} onChange={e => set("cidade", e.target.value)} placeholder="Maringá" className="bg-muted/40" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Endereço</Label>
              <Input value={form.endereco ?? ""} onChange={e => set("endereco", e.target.value)} placeholder="Av. Brasil, 4500 — Centro" className="bg-muted/40" />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input value={form.telefone ?? ""} onChange={e => set("telefone", e.target.value)} placeholder="(44) 3123-4567" className="bg-muted/40" />
            </div>
            <div className="space-y-1">
              <Label>E-mail</Label>
              <Input type="email" value={form.email ?? ""} onChange={e => set("email", e.target.value)} placeholder="contato@delegacia.pr.gov.br" className="bg-muted/40" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Responsável</Label>
              <Input value={form.responsavel ?? ""} onChange={e => set("responsavel", e.target.value)} placeholder="Delegado João Silva" className="bg-muted/40" />
            </div>
            <div className="col-span-2 flex items-center justify-between py-2 border-t border-border">
              <div>
                <p className="text-sm font-medium">Unidade ativa</p>
                <p className="text-xs text-muted-foreground">Aparece nas listas de seleção do sistema</p>
              </div>
              <Switch checked={form.ativo} onCheckedChange={v => set("ativo", v)} className="data-[state=checked]:bg-gold" />
            </div>
          </div>
          {error && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-border">Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold gap-2">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando…</> : <><Plus className="h-4 w-4" /> {initial ? "Salvar alterações" : "Cadastrar"}</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UnidadesPage() {
  const [delegacias, setDelegacias] = useState<Delegacia[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"cards" | "list">("cards");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Delegacia | null>(null);
  const [deleting, setDeleting] = useState<Delegacia | null>(null);
  const [deleting2, setDeleting2] = useState(false);

  const load = () => {
    setLoading(true);
    supabase.from("delegacias").select("*").order("nome")
      .then(({ data }) => { if (data) setDelegacias(data as Delegacia[]); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = delegacias.filter(d =>
    !query ||
    d.nome.toLowerCase().includes(query.toLowerCase()) ||
    (d.cidade ?? "").toLowerCase().includes(query.toLowerCase()) ||
    (d.responsavel ?? "").toLowerCase().includes(query.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleting2(true);
    await supabase.from("delegacias").delete().eq("id", deleting.id);
    setDeleting2(false);
    setDeleting(null);
    load();
  };

  const openEdit = (d: Delegacia) => { setEditing(d); setShowForm(true); };
  const openNew = () => { setEditing(null); setShowForm(true); };

  return (
    <>
      <UnidadeForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={load}
        initial={editing}
      />

      <AlertDialog open={!!deleting} onOpenChange={v => !v && setDeleting(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir unidade?</AlertDialogTitle>
            <AlertDialogDescription>
              A unidade <span className="font-semibold text-foreground">{deleting?.nome}</span> será removida permanentemente. Veículos vinculados a ela não serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting2}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {deleting2 ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PageHeader
        eyebrow="Multi-tenant"
        title="Unidades e órgãos"
        description="Cadastro de delegacias, fóruns e órgãos de origem vinculados ao tenant Maringá - PR."
        actions={
          <Button onClick={openNew} className="gap-2 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold">
            <Plus className="h-4 w-4" /> Nova unidade
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, cidade ou responsável…"
            className="pl-10 bg-muted/40"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-1 bg-muted/20">
          <Button
            variant="ghost" size="icon"
            className={`h-8 w-8 ${view === "cards" ? "bg-gradient-gold text-primary-foreground shadow-gold" : "text-muted-foreground"}`}
            onClick={() => setView("cards")}
            title="Cards"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className={`h-8 w-8 ${view === "list" ? "bg-gradient-gold text-primary-foreground shadow-gold" : "text-muted-foreground"}`}
            onClick={() => setView("list")}
            title="Lista"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} unidade(s)</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando unidades…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
          <Building2 className="h-12 w-12 opacity-30" />
          <p className="font-medium">Nenhuma unidade encontrada</p>
        </div>
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((u) => (
            <div key={u.id} className={`rounded-xl bg-gradient-card border p-5 shadow-elegant hover:border-gold-subtle transition-all ${u.ativo ? "border-border" : "border-border opacity-60"}`}>
              <div className="flex items-start gap-3 mb-3">
                <div className="h-11 w-11 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{TIPO_LABELS[u.tipo] ?? u.tipo}</p>
                  <h3 className="font-bold truncate">{u.nome}</h3>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-gold" onClick={() => openEdit(u)} title="Editar">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleting(u)} title="Excluir">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                {u.endereco && (
                  <p className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gold" />
                    {u.endereco}
                  </p>
                )}
                {u.telefone && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-gold" />
                    {u.telefone}
                  </p>
                )}
                {u.email && (
                  <p className="flex items-center gap-2 text-muted-foreground truncate">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-gold" />
                    {u.email}
                  </p>
                )}
                {u.responsavel && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-3.5 w-3.5 shrink-0 text-gold" />
                    {u.responsavel}
                  </p>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{u.cidade} — {u.uf}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${u.ativo ? "text-success bg-success/10 border border-success/20" : "text-muted-foreground bg-muted/20 border border-border"}`}>
                  {u.ativo ? "Ativa" : "Inativa"}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-gradient-card border border-border shadow-elegant overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground bg-muted/20 uppercase tracking-wider">
                  <th className="px-5 py-3 font-medium">Nome</th>
                  <th className="px-5 py-3 font-medium">Tipo</th>
                  <th className="px-5 py-3 font-medium">Cidade/UF</th>
                  <th className="px-5 py-3 font-medium">Telefone</th>
                  <th className="px-5 py-3 font-medium">Responsável</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className={`border-t border-border hover:bg-muted/20 transition-colors ${!u.ativo ? "opacity-60" : ""}`}>
                    <td className="px-5 py-3 font-semibold">{u.nome}</td>
                    <td className="px-5 py-3 text-muted-foreground">{TIPO_LABELS[u.tipo] ?? u.tipo}</td>
                    <td className="px-5 py-3 text-muted-foreground">{u.cidade} — {u.uf}</td>
                    <td className="px-5 py-3 text-muted-foreground">{u.telefone ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{u.responsavel ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${u.ativo ? "text-success bg-success/10 border border-success/20" : "text-muted-foreground bg-muted/20 border border-border"}`}>
                        {u.ativo ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-gold" onClick={() => openEdit(u)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleting(u)} title="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-border text-xs text-muted-foreground">
            {filtered.length} unidade(s) encontrada(s)
          </div>
        </div>
      )}
    </>
  );
}

