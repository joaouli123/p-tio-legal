import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Filter, Download, Search, MoreVertical, Eye, FileText, Camera } from "lucide-react";

export const Route = createFileRoute("/veiculos")({
  component: VeiculosPage,
  head: () => ({ meta: [{ title: "Veículos — Pátio Legal" }] }),
});

const vehicles = [
  { plate: "ABC1D23", chassi: "9BWA05U4ATT123456", model: "VW Gol 1.0", year: "2010/2011", color: "Branco", origin: "18ª SDP Maringá", entry: "10/05/2024", status: "em-analise" as const },
  { plate: "QWE4F56", chassi: "9C2KC1670GR123987", model: "Honda CG 160", year: "2018/2019", color: "Vermelho", origin: "1ª DP Maringá", entry: "12/05/2024", status: "no-patio" as const },
  { plate: "ZXC7G89", chassi: "9BD27801M9R456321", model: "Fiat Strada", year: "2014/2015", color: "Prata", origin: "Vara Criminal", entry: "08/05/2024", status: "destruido" as const },
  { plate: "POI2H34", chassi: "9BGKS48E0LG345789", model: "Chevrolet Onix", year: "2020/2021", color: "Preto", origin: "DENARC", entry: "15/05/2024", status: "leilao" as const },
  { plate: "MNB5J67", chassi: "JTDBT923671145982", model: "Toyota Corolla", year: "2019/2020", color: "Branco", origin: "2ª DP Maringá", entry: "11/05/2024", status: "restituido" as const },
  { plate: "RTY8K90", chassi: "9BFZH55P0MB223456", model: "Ford Ka", year: "2017/2018", color: "Azul", origin: "18ª SDP Maringá", entry: "13/05/2024", status: "no-patio" as const },
  { plate: "UIO1L23", chassi: "9BHHL481XJP445112", model: "Hyundai HB20", year: "2019/2020", color: "Cinza", origin: "1ª DP Maringá", entry: "14/05/2024", status: "em-analise" as const },
  { plate: "FGH4M56", chassi: "94DBSF61MNB778899", model: "Renault Kwid", year: "2021/2022", color: "Laranja", origin: "Vara Criminal", entry: "16/05/2024", status: "aguardando" as const },
];

function VeiculosPage() {
  return (
    <AppLayout>
      <PageHeader
        eyebrow="Cadastro de bens apreendidos"
        title="Veículos"
        description="Tipificação completa de carros, motos, caminhões, peças e outros bens apreendidos."
        actions={
          <>
            <Button variant="outline" className="gap-2 border-border">
              <Download className="h-4 w-4" /> Exportar
            </Button>
            <Button className="gap-2 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold">
              <Plus className="h-4 w-4" /> Novo veículo
            </Button>
          </>
        }
      />

      <div className="rounded-xl bg-gradient-card border border-border shadow-elegant overflow-hidden">
        <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por placa, chassi, RENAVAM…" className="pl-10 bg-muted/40" />
          </div>
          <Button variant="outline" className="gap-2 border-border">
            <Filter className="h-4 w-4" /> Filtros
          </Button>
          <div className="flex gap-1 text-xs">
            {["Todos", "No pátio", "Em análise", "Destruídos", "Restituídos", "Leilão"].map((t, i) => (
              <button
                key={t}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  i === 0 ? "bg-gold/15 text-gold border border-gold/30" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
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
              {vehicles.map((v) => (
                <tr key={v.plate} className="border-t border-border hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3 font-mono font-bold text-gold">{v.plate}</td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{v.chassi}</td>
                  <td className="px-5 py-3 font-medium">{v.model}</td>
                  <td className="px-5 py-3 text-muted-foreground">{v.year}</td>
                  <td className="px-5 py-3 text-muted-foreground">{v.color}</td>
                  <td className="px-5 py-3 text-muted-foreground">{v.origin}</td>
                  <td className="px-5 py-3 text-muted-foreground">{v.entry}</td>
                  <td className="px-5 py-3"><StatusBadge status={v.status} /></td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-gold">
                        <Link to="/processos"><Eye className="h-4 w-4" /></Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-gold"><Camera className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-gold"><FileText className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-gold"><MoreVertical className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>Mostrando 8 de 1.248 veículos</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="border-border">Anterior</Button>
            <Button size="sm" className="bg-gradient-gold text-primary-foreground">1</Button>
            <Button variant="outline" size="sm" className="border-border">2</Button>
            <Button variant="outline" size="sm" className="border-border">3</Button>
            <Button variant="outline" size="sm" className="border-border">Próximo</Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
