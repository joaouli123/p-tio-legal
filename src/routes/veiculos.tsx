import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PlateStatusBadge } from "@/components/PlateStatusBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Download, Search, MoreVertical, Eye, FileText, Camera, Loader2, X, MessageCircle, FilePenLine, Upload, ImagePlus, CheckCircle2, AlertCircle } from "lucide-react";
import { getVeiculos, createVeiculo, type Veiculo, type VehicleStatus } from "@/lib/db";
import { buildListExportDocument, buildVehicleSummaryDocument, downloadPdfDocument, downloadWordDocument, formatVehicleStatusLabel, shareDocumentViaWhatsApp } from "@/lib/document-utils";
import { MISSING_PLATE_VALUE, PLATE_STATUS_LABELS, SUPPRESSED_CHASSIS_VALUE, isMissingPlateValue, isSuppressedChassisValue, resolvePlateStatus, type PlateStatus } from "@/lib/plate-status";
import { supabase } from "@/lib/supabase";
import { prepareImageForUpload } from "@/lib/image-upload";
import { getSignedPhotoUrl } from "@/lib/storage";

const VEHICLE_ROUTE_FILTERS = ["todos", "no_patio", "em_analise", "destruido", "restituido", "leilao", "doacao", "aguardando"] as const;

type VehicleRouteFilter = typeof VEHICLE_ROUTE_FILTERS[number];

function parseVehicleSearch(search: Record<string, unknown>) {
  const status = typeof search.status === "string" && VEHICLE_ROUTE_FILTERS.includes(search.status as VehicleRouteFilter)
    ? (search.status as VehicleRouteFilter)
    : "todos";

  const query = typeof search.q === "string" ? search.q : "";
  const openNew = search.openNew === true || search.openNew === "true" || search.openNew === "1";

  return { status, q: query, openNew };
}

export const Route = createFileRoute("/veiculos")({
  validateSearch: parseVehicleSearch,
  component: VeiculosPage,
  head: () => ({ meta: [{ title: "Veículos — Pátio Legal" }] }),
});

const FILTERS: { label: string; value: VehicleStatus | 'todos' }[] = [
  { label: "Todos",       value: "todos" },
  { label: "No pátio",   value: "no_patio" },
  { label: "Em análise", value: "em_analise" },
  { label: "Destruídos", value: "destruido" },
  { label: "Restituídos",value: "restituido" },
  { label: "Leilão",     value: "leilao" },
  { label: "Destinações", value: "doacao" },
  { label: "Aguardando", value: "aguardando" },
];

const PATIO_SECTORS = [
  { value: "A", label: "Setor A — Interno (início do barracão)" },
  { value: "B", label: "Setor B — Interno (meio do barracão)" },
  { value: "C", label: "Setor C — Interno (fundo do barracão)" },
  { value: "D", label: "Setor D — Peças / Outros" },
  { value: "EXTERNO", label: "Pátio Externo" },
  { value: "EXTERNO-1", label: "Setor Externo 1" },
  { value: "EXTERNO-2", label: "Setor Externo 2" },
  { value: "EXTERNO-3", label: "Setor Externo 3" },
  { value: "EXTERNO-4", label: "Setor Externo 4" },
  { value: "EXTERNO-5", label: "Setor Externo 5" },
  { value: "EXTERNO-6", label: "Setor Externo 6" },
] as const;

function buildPatioLocation(setor: string, detalhe: string) {
  const setorLabel = PATIO_SECTORS.find((item) => item.value === setor)?.label;
  if (setorLabel && detalhe.trim()) return `${setorLabel} · ${detalhe.trim()}`;
  if (setorLabel) return setorLabel;
  return detalhe.trim();
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

const EMPTY_FORM = {
  placa: "", chassi: "", marca_modelo: "", ano: "", cor: "",
  placa_oficial: "", status_placa: "regular" as PlateStatus,
  marca_modelo_consulta: "", ano_consulta: "", cor_consulta: "", tipo_consulta: "",
  tipo: "automovel" as const, situacao: "integro" as const,
  status: "no_patio" as const, delegacia_nome: "", processo: "",
  setor: "", vaga_detalhe: "", observacoes: "",
};

const PLATE_STATUS_OPTIONS: Array<{ value: PlateStatus; label: string }> = [
  { value: 'regular', label: PLATE_STATUS_LABELS.regular },
  { value: 'em_verificacao', label: PLATE_STATUS_LABELS.em_verificacao },
  { value: 'divergente', label: PLATE_STATUS_LABELS.divergente },
  { value: 'suspeita_adulteracao', label: PLATE_STATUS_LABELS.suspeita_adulteracao },
];

const EXPORT_HEADERS = ["Placa", "Chassi", "Marca / Modelo", "Ano", "Cor", "Delegacia", "Processo", "Localização", "Status"];

function formatLookupSummary(form: typeof EMPTY_FORM) {
  return [
    form.placa_oficial || form.placa,
    form.marca_modelo_consulta,
    form.ano_consulta,
    form.cor_consulta,
    form.tipo_consulta,
  ].filter(Boolean).join(' • ');
}

function NovoVeiculoDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lookupStatus, setLookupStatus] = useState<'idle'|'loading'|'found'|'duplicate'|'error'>('idle');
  const [lookupMessage, setLookupMessage] = useState('');
  const [duplicateInfo, setDuplicateInfo] = useState<{id:string;status:string;modelo:string}|null>(null);

  const set = (k: keyof typeof EMPTY_FORM, v: string) => setForm(f => ({ ...f, [k]: v }));
  const effectivePlateStatus = resolvePlateStatus(form);
  const hasLookupSnapshot = !!(form.marca_modelo_consulta || form.ano_consulta || form.cor_consulta || form.tipo_consulta);
  const needsPlateReview = effectivePlateStatus !== 'regular';
  const plateMissing = isMissingPlateValue(form.placa);
  const chassiSuppressed = isSuppressedChassisValue(form.chassi);
  const initialVehicleStatus = needsPlateReview ? 'em_analise' : form.status;

  useEffect(() => {
    if (!open) { setLookupStatus('idle'); setLookupMessage(''); setDuplicateInfo(null); return; }
    if (isMissingPlateValue(form.placa)) { setLookupStatus('idle'); setLookupMessage(''); setDuplicateInfo(null); return; }
    const placa = form.placa.replace(/[^A-Z0-9]/g, '').toUpperCase();
    if (placa.length < 7) { setLookupStatus('idle'); setLookupMessage(''); setDuplicateInfo(null); return; }
    setLookupStatus('loading');
    setLookupMessage('');
    const timer = setTimeout(async () => {
      try {
        // 1. Verify own database first
        const { data: existing } = await supabase
          .from('veiculos')
          .select('id, placa, marca_modelo, status')
          .ilike('placa', placa)
          .maybeSingle();
        if (existing) {
          setDuplicateInfo({ id: existing.id, status: existing.status, modelo: existing.marca_modelo });
          setLookupStatus('duplicate');
          setLookupMessage('Placa já cadastrada no sistema.');
          return;
        }
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        if (!accessToken) {
          setLookupStatus('error');
          setLookupMessage('Sessão expirada. Faça login novamente para consultar a placa.');
          return;
        }
        const res = await fetch(`/api/plate-lookup?plate=${encodeURIComponent(placa)}`, {
          signal: AbortSignal.timeout(8000),
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const payload = await res.json();

        if (payload.status === 'found' && payload.data) {
          setForm((current) => ({
            ...current,
            marca_modelo: payload.data.marcaModelo,
            ano: payload.data.ano || current.ano,
            cor: payload.data.cor || current.cor,
            chassi: isSuppressedChassisValue(current.chassi) ? current.chassi : (payload.data.chassi || current.chassi),
            tipo: payload.data.tipo || current.tipo,
            placa_oficial: placa,
            marca_modelo_consulta: payload.data.marcaModelo,
            ano_consulta: payload.data.ano || '',
            cor_consulta: payload.data.cor || '',
            tipo_consulta: payload.data.tipo || '',
          }));
          setLookupStatus('found');
          setLookupMessage('Dados preenchidos automaticamente.');
          return;
        }

        setLookupStatus('error');
        setLookupMessage(payload.message ?? 'Não foi possível consultar a placa.');
      } catch {
        setLookupStatus('error');
        setLookupMessage('Falha ao consultar a placa.');
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [form.placa, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.placa || !form.marca_modelo || !form.delegacia_nome || !form.processo) {
      setError("Preencha os campos obrigatórios: Placa, Marca/Modelo, Delegacia e Processo.");
      return;
    }
    if (needsPlateReview && !form.chassi.trim()) {
      setError("Preencha o chassi para concluir um cadastro com placa divergente ou suspeita.");
      return;
    }
    if (needsPlateReview && !form.observacoes.trim()) {
      setError("Descreva a divergência da placa em Observações antes de concluir o cadastro.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const localVaga = buildPatioLocation(form.setor, form.vaga_detalhe);
      await createVeiculo({
        placa: form.placa,
        chassi: form.chassi || undefined,
        marca_modelo: form.marca_modelo,
        ano: form.ano || undefined,
        cor: form.cor || undefined,
        placa_oficial: (form.placa_oficial || (plateMissing ? '' : form.placa)) || undefined,
        status_placa: effectivePlateStatus,
        marca_modelo_consulta: form.marca_modelo_consulta || undefined,
        ano_consulta: form.ano_consulta || undefined,
        cor_consulta: form.cor_consulta || undefined,
        tipo_consulta: form.tipo_consulta || undefined,
        tipo: form.tipo,
        situacao: form.situacao,
        status: initialVehicleStatus,
        delegacia_nome: form.delegacia_nome,
        processo: form.processo,
        setor: form.setor || undefined,
        local_vaga: localVaga || undefined,
        observacoes: form.observacoes || undefined,
        registrado_por: user?.id,
      });
      setForm(EMPTY_FORM);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Erro ao salvar veículo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Cadastrar novo veículo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Placa ostentada <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  value={form.placa}
                  onChange={e => {
                    const nextPlate = e.target.value.toUpperCase();
                    setForm((current) => ({
                      ...current,
                      placa: nextPlate,
                      placa_oficial: '',
                      status_placa: current.status_placa === 'suspeita_adulteracao' ? current.status_placa : 'regular',
                      marca_modelo_consulta: '',
                      ano_consulta: '',
                      cor_consulta: '',
                      tipo_consulta: '',
                    }));
                    setLookupStatus('idle');
                    setLookupMessage('');
                    setDuplicateInfo(null);
                  }}
                  placeholder="ABC1D23"
                  className="bg-muted/40 font-mono uppercase pr-9"
                  maxLength={8}
                  disabled={plateMissing}
                />
                {lookupStatus === 'loading' && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                {lookupStatus === 'found' && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />}
                {lookupStatus === 'duplicate' && <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-500" />}
                {lookupStatus === 'error' && <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Checkbox
                  id="sem-placa"
                  checked={plateMissing}
                  onCheckedChange={checked => {
                    const enabled = !!checked;
                    setForm((current) => ({
                      ...current,
                      placa: enabled ? MISSING_PLATE_VALUE : '',
                      placa_oficial: '',
                      status_placa: 'regular',
                      marca_modelo_consulta: '',
                      ano_consulta: '',
                      cor_consulta: '',
                      tipo_consulta: '',
                    }));
                    setLookupStatus('idle');
                    setLookupMessage('');
                    setDuplicateInfo(null);
                  }}
                />
                <Label htmlFor="sem-placa" className="cursor-pointer text-xs text-muted-foreground">
                  Marque quando o veículo não possuir identificação de placa.
                </Label>
              </div>
              {lookupStatus === 'found' && lookupMessage && (
                <p className="text-xs text-green-500">{lookupMessage}</p>
              )}
              {lookupStatus === 'duplicate' && duplicateInfo && (
                <p className="text-xs text-yellow-500">
                  Placa já cadastrada: {duplicateInfo.modelo}
                </p>
              )}
              {lookupStatus === 'error' && lookupMessage && (
                <p className="text-xs text-red-500">{lookupMessage}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Chassi</Label>
              <Input value={form.chassi} onChange={e => set("chassi", e.target.value.toUpperCase())} placeholder="9BWAA05U4JT123456" className="bg-muted/40 font-mono uppercase" disabled={chassiSuppressed} />
              <div className="flex items-center gap-2 pt-2">
                <Checkbox
                  id="chassi-suprimido"
                  checked={chassiSuppressed}
                  onCheckedChange={checked => set("chassi", checked ? SUPPRESSED_CHASSIS_VALUE : "")}
                />
                <Label htmlFor="chassi-suprimido" className="cursor-pointer text-xs text-muted-foreground">
                  Marque quando o chassi estiver suprimido e sem numeração legível.
                </Label>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Placa oficial / real</Label>
              <Input
                value={form.placa_oficial}
                onChange={e => set("placa_oficial", e.target.value.toUpperCase())}
                placeholder="Preenchida pela consulta ou confirmação pericial"
                className="bg-muted/40 font-mono uppercase"
                maxLength={8}
              />
            </div>
            <div className="space-y-1">
              <Label>Status da placa</Label>
              <Select value={effectivePlateStatus} onValueChange={v => set("status_placa", v)}>
                <SelectTrigger className="bg-muted/40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATE_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(hasLookupSnapshot || needsPlateReview) && (
            <div className={`rounded-xl border p-4 space-y-3 ${needsPlateReview ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-muted/20'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <PlateStatusBadge status={effectivePlateStatus} />
                {hasLookupSnapshot && <p className="text-sm text-muted-foreground">Consulta oficial vinculada a esta placa ostentada.</p>}
              </div>
              {hasLookupSnapshot && (
                <div className="rounded-lg border border-border bg-card/70 px-3 py-2 text-sm">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Referência oficial da consulta</p>
                  <p className="font-medium">{formatLookupSummary(form) || 'Consulta realizada sem dados complementares.'}</p>
                </div>
              )}
              {needsPlateReview && (
                <p className="text-sm text-destructive">
                  O veículo será salvo automaticamente como Em análise até a conferência do chassi, fotos e validação documental da divergência.
                </p>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2">
              <Label>Marca / Modelo <span className="text-destructive">*</span></Label>
              <Input value={form.marca_modelo} onChange={e => set("marca_modelo", e.target.value)} placeholder="VW / GOL 1.0" className="bg-muted/40" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Ano</Label>
              <Input value={form.ano} onChange={e => set("ano", e.target.value)} placeholder="2020/2021" className="bg-muted/40" />
            </div>
            <div className="space-y-1">
              <Label>Cor</Label>
              <Input value={form.cor} onChange={e => set("cor", e.target.value)} placeholder="Branco" className="bg-muted/40" />
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => set("tipo", v)}>
                <SelectTrigger className="bg-muted/40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="automovel">Automóvel</SelectItem>
                  <SelectItem value="motocicleta">Motocicleta</SelectItem>
                  <SelectItem value="caminhao">Caminhão</SelectItem>
                  <SelectItem value="van_utilitario">Van / Utilitário</SelectItem>
                  <SelectItem value="onibus">Ônibus</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Situação de chegada</Label>
              <Select value={form.situacao} onValueChange={v => set("situacao", v)}>
                <SelectTrigger className="bg-muted/40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="integro">Íntegro</SelectItem>
                  <SelectItem value="sinistrado">Sinistrado</SelectItem>
                  <SelectItem value="queimado">Queimado</SelectItem>
                  <SelectItem value="sucata">Sucata</SelectItem>
                  <SelectItem value="descaracterizado">Descaracterizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status inicial</Label>
              <Select value={initialVehicleStatus} onValueChange={v => set("status", v)} disabled={needsPlateReview}>
                <SelectTrigger className="bg-muted/40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_patio">No pátio</SelectItem>
                  <SelectItem value="em_analise">Em análise</SelectItem>
                  <SelectItem value="aguardando">Aguardando</SelectItem>
                </SelectContent>
              </Select>
              {needsPlateReview && <p className="text-xs text-destructive">Com divergência aberta, o fluxo segue obrigatoriamente como Em análise.</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Delegacia de origem <span className="text-destructive">*</span></Label>
              <Input value={form.delegacia_nome} onChange={e => set("delegacia_nome", e.target.value)} placeholder="15ª SDP Maringá" className="bg-muted/40" />
            </div>
            <div className="space-y-1">
              <Label>Número do processo <span className="text-destructive">*</span></Label>
              <Input value={form.processo} onChange={e => set("processo", e.target.value)} placeholder="0001234-56.2024.8.16.0190" className="bg-muted/40 font-mono" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Setor do pátio</Label>
            <Select value={form.setor} onValueChange={v => set("setor", v)}>
              <SelectTrigger className="bg-muted/40"><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
              <SelectContent>
                {PATIO_SECTORS.map((sector) => (
                  <SelectItem key={sector.value} value={sector.value}>{sector.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Vaga / fileira / detalhe</Label>
            <Input value={form.vaga_detalhe} onChange={e => set("vaga_detalhe", e.target.value)} placeholder="Ex.: Fileira 2 · Vaga 08" className="bg-muted/40" />
          </div>
          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={e => set("observacoes", e.target.value)} placeholder="Informações adicionais sobre o veículo..." className="bg-muted/40 resize-none" rows={3} />
          </div>
          {error && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>}
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-border">Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold gap-2">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</> : <><Plus className="h-4 w-4" /> Cadastrar veículo</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VeiculosPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(search.q);
  const [debouncedQuery, setDebouncedQuery] = useState(search.q);
  const [filter, setFilter] = useState<VehicleStatus | 'todos'>(search.status);
  const [showForm, setShowForm] = useState(search.openNew);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [photoTarget, setPhotoTarget] = useState<Veiculo | null>(null);
  const [uploadingVehicleId, setUploadingVehicleId] = useState<string | null>(null);
  const captureInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setFilter(search.status);
  }, [search.status]);

  useEffect(() => {
    setQuery(search.q);
  }, [search.q]);

  // Debounce the search term so filtering only recomputes after the user pauses.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setShowForm(search.openNew);
  }, [search.openNew]);

  const load = () => {
    setLoading(true);
    getVeiculos(filter === 'todos' ? undefined : filter)
      .then(setVeiculos)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const updateRouteSearch = (nextSearch: Partial<{ status: VehicleRouteFilter; q: string; openNew: boolean }>) => {
    void navigate({
      to: "/veiculos",
      replace: true,
      search: {
        status: nextSearch.status ?? filter,
        q: nextSearch.q ?? query,
        openNew: nextSearch.openNew ?? showForm,
      },
    });
  };

  const handleFilterChange = (nextFilter: VehicleStatus | 'todos') => {
    setFilter(nextFilter);
    updateRouteSearch({ status: nextFilter });
  };

  const handleNewVehicleOpen = () => {
    setShowForm(true);
    updateRouteSearch({ openNew: true });
  };

  const handleNewVehicleClose = () => {
    setShowForm(false);
    updateRouteSearch({ openNew: false });
  };

  const startPhotoUpload = (vehicle: Veiculo, mode: 'camera' | 'gallery') => {
    setPhotoTarget(vehicle);
    if (mode === 'camera') captureInputRef.current?.click();
    else galleryInputRef.current?.click();
  };

  const handlePhotoFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !photoTarget) return;

    setUploadingVehicleId(photoTarget.id);
    setNotice(null);
    try {
      const prepared = await prepareImageForUpload(file);
      const storagePath = `${photoTarget.id}/chegada_${Date.now()}_${prepared.filename.replace(/\s+/g, '-')}`;
      const { error: uploadError } = await supabase.storage
        .from('fotos-veiculos')
        .upload(storagePath, prepared.blob, { upsert: true, contentType: prepared.contentType });

      if (uploadError) throw uploadError;

      const signedUrl = await getSignedPhotoUrl(storagePath);
      const { error: insertError } = await supabase.from('fotos').insert({
        veiculo_id: photoTarget.id,
        storage_path: storagePath,
        url: signedUrl,
        tipo: 'chegada',
        label: file.name,
      });
      if (insertError) throw insertError;

      setNotice({ type: 'success', text: `Foto registrada para ${photoTarget.placa}.` });
    } catch (uploadErr: any) {
      setNotice({ type: 'error', text: uploadErr.message ?? 'Não foi possível enviar a foto.' });
    } finally {
      setUploadingVehicleId(null);
      setPhotoTarget(null);
      event.target.value = '';
    }
  };

  const filtered = useMemo(() => {
    const term = debouncedQuery.trim().toLowerCase();
    if (!term) return veiculos;
    return veiculos.filter(v =>
      v.placa.toLowerCase().includes(term) ||
      v.marca_modelo.toLowerCase().includes(term) ||
      (v.chassi ?? '').toLowerCase().includes(term) ||
      (v.processo ?? '').toLowerCase().includes(term) ||
      (v.delegacia_nome ?? '').toLowerCase().includes(term)
    );
  }, [veiculos, debouncedQuery]);

  const activeFilterLabel = FILTERS.find((item) => item.value === filter)?.label ?? "Todos";
  const vehicleListDocument = useMemo(() => buildListExportDocument({
    title: "LISTAGEM COMPLETA DE VEÍCULOS",
    subtitle: "Pátio Legal Maringá SAT • Exportação integral do cadastro de veículos",
    filenameLabel: `veiculos-${filter}${query ? `-${query}` : ""}`,
    meta: [
      { label: "Filtro aplicado", value: activeFilterLabel },
      { label: "Busca", value: query.trim() || "Sem termo de busca" },
      { label: "Origens únicas", value: String(new Set(filtered.map((vehicle) => vehicle.delegacia_nome ?? "—")).size) },
    ],
    paragraphs: [
      `Esta exportação reúne a lista completa de ${filtered.length} veículo(s) exibidos atualmente na tela de cadastro de bens apreendidos.`,
      `Filtro aplicado: ${activeFilterLabel}.${query.trim() ? ` Busca atual: ${query.trim()}.` : ""}`,
    ],
    headers: EXPORT_HEADERS,
    rows: filtered.map((vehicle) => [
      vehicle.placa,
      vehicle.chassi ?? "—",
      vehicle.marca_modelo,
      vehicle.ano ?? "—",
      vehicle.cor ?? "—",
      vehicle.delegacia_nome ?? "—",
      vehicle.processo ?? "—",
      vehicle.local_vaga ?? "—",
      formatVehicleStatusLabel(vehicle.status),
    ]),
  }), [activeFilterLabel, filter, filtered, query]);

  return (
    <>
      <NovoVeiculoDialog open={showForm} onClose={handleNewVehicleClose} onSaved={load} />
      <PageHeader
        eyebrow="Cadastro de bens apreendidos"
        title="Veículos"
        description="Tipificação completa de carros, motos, caminhões, peças e outros bens apreendidos."
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 border-border" disabled={filtered.length === 0}>
                  <Download className="h-4 w-4" /> Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Lista completa da tela ({filtered.length})</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => void downloadPdfDocument(vehicleListDocument)}>
                  <FileText className="h-4 w-4" /> Exportar lista completa em PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void downloadWordDocument(vehicleListDocument)}>
                  <FilePenLine className="h-4 w-4" /> Exportar lista completa em Word
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void shareDocumentViaWhatsApp(vehicleListDocument, "pdf")}>
                  <MessageCircle className="h-4 w-4" /> Enviar lista completa em PDF por WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void shareDocumentViaWhatsApp(vehicleListDocument, "word")}>
                  <MessageCircle className="h-4 w-4" /> Enviar lista completa em Word por WhatsApp
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleNewVehicleOpen} className="gap-2 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold">
              <Plus className="h-4 w-4" /> Novo veículo
            </Button>
          </>
        }
      />

      <div className="hidden">
        <input ref={captureInputRef} type="file" accept="image/*" capture="environment" onChange={(event) => void handlePhotoFile(event)} />
        <input ref={galleryInputRef} type="file" accept="image/*" onChange={(event) => void handlePhotoFile(event)} />
      </div>

      {notice && (
        <div className={`rounded-xl border p-4 text-sm font-medium ${notice.type === 'success' ? 'bg-success/10 border-success/30 text-success' : 'bg-destructive/10 border-destructive/30 text-destructive'}`}>
          {notice.text}
        </div>
      )}

      <div className="rounded-xl bg-gradient-card border border-border shadow-elegant overflow-hidden">
        <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por placa, chassi, modelo…"
              className="pl-10 bg-muted/40"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1 text-xs">
            {FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => handleFilterChange(f.value)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  filter === f.value
                    ? "bg-gold/15 text-gold border border-gold/30"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Carregando veículos…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <span className="text-4xl">🚗</span>
              <p className="font-medium">Nenhum veículo encontrado</p>
              <p className="text-sm">Tente ajustar os filtros ou a busca</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground bg-muted/20 uppercase tracking-wider">
                  <th className="px-5 py-3 font-medium">Placa</th>
                  <th className="px-5 py-3 font-medium">Chassi</th>
                  <th className="px-5 py-3 font-medium">Marca/Modelo</th>
                  <th className="px-5 py-3 font-medium">Ano</th>
                  <th className="px-5 py-3 font-medium">Cor</th>
                  <th className="px-5 py-3 font-medium">Origem</th>
                  <th className="px-5 py-3 font-medium">Entrada</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => {
                  const plateStatus = resolvePlateStatus(v);

                  return (
                  <tr
                    key={v.id}
                    className="border-t border-border hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => navigate({ to: "/veiculos/$id", params: { id: v.id }, search: { status: "todos", q: "", openNew: false } })}
                    title="Clique para abrir o cadastro completo do veículo"
                  >
                    <td className="px-5 py-3">
                      <div className="space-y-1">
                        <p className="font-mono font-bold text-gold">{v.placa}</p>
                        {plateStatus !== 'regular' && (
                          <div className="flex flex-wrap items-center gap-2">
                            <PlateStatusBadge status={plateStatus} compact />
                            {v.placa_oficial && v.placa_oficial !== v.placa && (
                              <span className="text-xs text-muted-foreground">Oficial: {v.placa_oficial}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{v.chassi ?? '—'}</td>
                    <td className="px-5 py-3 font-medium">{v.marca_modelo}</td>
                    <td className="px-5 py-3 text-muted-foreground">{v.ano ?? '—'}</td>
                    <td className="px-5 py-3 text-muted-foreground">{v.cor ?? '—'}</td>
                    <td className="px-5 py-3 text-muted-foreground">{v.delegacia_nome ?? '—'}</td>
                    <td className="px-5 py-3 text-muted-foreground">{fmt(v.created_at)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={v.status as any} />
                    </td>
                    <td className="px-5 py-3" onClick={(event) => event.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-gold" title="Ver detalhes" onClick={() => navigate({ to: "/veiculos/$id", params: { id: v.id }, search: { status: "todos", q: "", openNew: false } })}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-gold" title="Fotos" disabled={uploadingVehicleId === v.id}>
                              {uploadingVehicleId === v.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => startPhotoUpload(v, 'camera')}>
                              <Camera className="h-4 w-4" /> Tirar foto agora
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => startPhotoUpload(v, 'gallery')}>
                              <ImagePlus className="h-4 w-4" /> Escolher arquivo / galeria
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate({ to: "/veiculos/$id", params: { id: v.id }, search: { status: "todos", q: "", openNew: false } })}>
                              <Upload className="h-4 w-4" /> Abrir ficha do veículo
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-gold" title="PDF do cadastro" onClick={() => void downloadPdfDocument(buildVehicleSummaryDocument({ veiculo: v }))}>
                          <FileText className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-gold" title="Mais opções">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => void shareDocumentViaWhatsApp(buildVehicleSummaryDocument({ veiculo: v }), 'pdf')}>
                              <MessageCircle className="h-4 w-4" /> Enviar cadastro por WhatsApp
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void downloadWordDocument(buildVehicleSummaryDocument({ veiculo: v }))}>
                              <FilePenLine className="h-4 w-4" /> Abrir cadastro no Word
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => navigate({ to: "/veiculos/$id", params: { id: v.id }, search: { status: "todos", q: "", openNew: false } })}>
                              <Eye className="h-4 w-4" /> Ver detalhes completos
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>Mostrando {filtered.length} de {veiculos.length} veículos</span>
        </div>
      </div>
    </>
  );
}
