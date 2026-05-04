import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/configuracoes")({
  component: ConfigPage,
  head: () => ({ meta: [{ title: "Configurações — Pátio Legal" }] }),
});

function ConfigPage() {
  return (
    <>
      <PageHeader
        eyebrow="Sistema"
        title="Configurações do tenant"
        description="Preferências da unidade Maringá - PR. Apenas Administradores."
      />

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-gradient-card border border-border p-6 shadow-elegant space-y-4">
          <h3 className="font-semibold text-lg">Identificação do tenant</h3>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input defaultValue="Pátio Legal Maringá SAT" className="bg-muted/40 mt-1" />
            </div>
            <div>
              <Label>CNPJ</Label>
              <Input defaultValue="00.000.000/0001-00" className="bg-muted/40 mt-1 font-mono" />
            </div>
            <div>
              <Label>Cidade / UF</Label>
              <Input defaultValue="Maringá - PR" className="bg-muted/40 mt-1" />
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-card border border-border p-6 shadow-elegant space-y-4">
          <h3 className="font-semibold text-lg">Preferências operacionais</h3>
          {[
            { l: "Compressão de vídeos no upload", d: "Reduz custos de storage", v: true },
            { l: "Notificações por e-mail", d: "Alertas de novos laudos e destruições", v: true },
            { l: "Backup automático diário", d: "Rotina de segurança às 02h", v: true },
            { l: "Validação de placa via SINESP", d: "Consulta automática na entrada", v: false },
          ].map((p) => (
            <div key={p.l} className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0">
              <div>
                <p className="font-medium text-sm">{p.l}</p>
                <p className="text-xs text-muted-foreground">{p.d}</p>
              </div>
              <Switch defaultChecked={p.v} className="data-[state=checked]:bg-gold" />
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-gradient-card border border-border p-6 shadow-elegant lg:col-span-2">
          <h3 className="font-semibold text-lg mb-1">Storage e backup</h3>
          <p className="text-xs text-muted-foreground mb-4">Conexão com AWS S3</p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-lg bg-muted/20 border border-border p-4">
              <p className="text-xs text-muted-foreground">Espaço usado</p>
              <p className="text-2xl font-bold text-gold">847 GB</p>
              <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                <div className="h-full w-[42%] bg-gradient-gold" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">42% de 2 TB</p>
            </div>
            <div className="rounded-lg bg-muted/20 border border-border p-4">
              <p className="text-xs text-muted-foreground">Vídeos armazenados</p>
              <p className="text-2xl font-bold text-info">1.284</p>
              <p className="text-[11px] text-muted-foreground mt-1">+34 esta semana</p>
            </div>
            <div className="rounded-lg bg-muted/20 border border-border p-4">
              <p className="text-xs text-muted-foreground">Último backup</p>
              <p className="text-2xl font-bold text-success">há 4h</p>
              <p className="text-[11px] text-muted-foreground mt-1">Sucesso • 02:00</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 flex justify-end gap-2">
          <Button variant="outline" className="border-border">Cancelar</Button>
          <Button className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold">
            Salvar alterações
          </Button>
        </div>
      </div>
    </>
  );
}
