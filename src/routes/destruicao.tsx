import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Camera, Video, Check, AlertTriangle, Flame, FileCheck2, QrCode, Hash } from "lucide-react";

export const Route = createFileRoute("/destruicao")({
  component: DestruicaoPage,
  head: () => ({ meta: [{ title: "Destruição — Pátio Legal" }] }),
});

function DestruicaoPage() {
  const steps = [
    { id: 1, label: "Foto do ANTES", done: true, icon: Camera },
    { id: 2, label: "Vídeo da operação", done: true, icon: Video },
    { id: 3, label: "Foto do DEPOIS", done: false, icon: Camera },
    { id: 4, label: "Geração do laudo", done: false, icon: FileCheck2 },
  ];

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Motor de destruição"
        title="Destruição controlada"
        description="Fluxo travado com validade jurídica — laudo gerado server-side com QR Code e hash SHA-256."
      />

      <div className="rounded-xl bg-gradient-card border border-gold/30 p-6 shadow-glow">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-destructive/15 border border-destructive/30 flex items-center justify-center shrink-0">
            <Flame className="h-6 w-6 text-destructive" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h2 className="text-xl font-bold">Operação em andamento</h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-destructive/15 text-destructive border border-destructive/30 animate-pulse">
                AO VIVO
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Veículo: <span className="text-gold font-mono font-semibold">ZXC7G89</span> • Fiat Strada 2014/2015 •
              Processo <span className="font-mono">0003456-78.2024.8.16.0190</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-6">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.id}
                className={`rounded-lg border p-4 transition-all ${
                  s.done
                    ? "bg-success/10 border-success/30"
                    : "bg-muted/20 border-border"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`h-5 w-5 ${s.done ? "text-success" : "text-muted-foreground"}`} />
                  {s.done ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Etapa {s.id}</p>
                <p className="font-semibold text-sm">{s.label}</p>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 mt-6">
          <Button variant="outline" className="gap-2 border-border">
            <Camera className="h-4 w-4" /> Foto DEPOIS
          </Button>
          <Button
            disabled
            className="gap-2 bg-gradient-to-r from-destructive to-destructive/70 text-destructive-foreground opacity-50 cursor-not-allowed"
          >
            <Flame className="h-4 w-4" /> Finalizar destruição
          </Button>
          <p className="text-xs text-muted-foreground self-center">
            ⚠️ Botão liberado somente após todas as etapas obrigatórias.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-gradient-card border border-border p-6 shadow-elegant">
          <h3 className="font-semibold text-lg mb-4">Como funciona o fluxo</h3>
          <ol className="space-y-3 text-sm">
            {[
              "App envia ordem para o backend após captura obrigatória de mídia.",
              "Backend compila o PDF com fotos em alta resolução (sem travar o celular).",
              "Vídeo passa por compressão antes do upload para o storage seguro.",
              "Numeração sequencial automática: LD-2026-XXXX.",
              "QR Code embutido aponta para o vídeo da destruição.",
              "Hash SHA-256 no rodapé garante tecnologia anti-fraude.",
            ].map((t, i) => (
              <li key={i} className="flex gap-3">
                <span className="h-6 w-6 rounded-full bg-gold/15 text-gold border border-gold/30 flex items-center justify-center text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{t}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-xl bg-gradient-card border border-border p-6 shadow-elegant">
          <h3 className="font-semibold text-lg mb-4">Assinatura tecnológica</h3>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/30 p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <FileCheck2 className="h-4 w-4 text-gold" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Numeração</span>
              </div>
              <p className="font-mono font-bold text-gold text-lg">LD-2026-0287</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <QrCode className="h-4 w-4 text-gold" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">QR Code do vídeo</span>
              </div>
              <p className="text-xs text-muted-foreground break-all">https://storage.patiolegal.app/v/ld-2026-0287.mp4</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="h-4 w-4 text-gold" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">SHA-256</span>
              </div>
              <p className="font-mono text-[11px] text-muted-foreground break-all">
                a9f5c2e8b1d47632c0a81f9d6e3b5a274c9e0f1d8b6a3e5c2f7d9b0a1e4c6f8d
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
