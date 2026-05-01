import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, User, ShieldCheck, ArrowRight } from "lucide-react";
import { FormEvent } from "react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Acessar — Pátio Legal Maringá SAT" }],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Painel esquerdo — branding */}
      <div className="hidden lg:flex relative bg-gradient-hero overflow-hidden p-12 flex-col justify-between">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(oklch(0.80_0.14_85/30%)_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />
        <div className="absolute -top-20 -left-20 h-96 w-96 rounded-full bg-info/10 blur-3xl" />

        <div className="relative">
          <Logo size="lg" />
        </div>

        <div className="relative space-y-6 max-w-lg">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">
            Sistema integrado de gestão e destinação veicular
          </p>
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight">
            A solução em armazenamento de veículos apreendidos que as{" "}
            <span className="text-gradient-gold">delegacias precisam.</span>
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Tecnologia e controle total em todas as etapas do processo, garantindo transparência,
            rastreabilidade e segurança jurídica.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-4">
            {[
              "Controle total",
              "Segurança jurídica",
              "Transparência",
              "100% digital",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-gold" />
                {f}
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-muted-foreground">
          © 2026 Pátio Legal Maringá SAT • Maringá - PR
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo size="lg" />
          </div>

          <div className="rounded-2xl bg-gradient-card border border-border p-8 shadow-elegant">
            <div className="mb-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">
                Bem-vindo de volta
              </p>
              <h2 className="text-2xl font-bold mt-1">Acessar o sistema</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Entre com suas credenciais institucionais
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user">Usuário</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="user"
                    placeholder="seu.usuario"
                    className="pl-10 h-11 bg-input border-border focus-visible:ring-gold"
                    defaultValue="master.admin"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pwd">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="pwd"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 h-11 bg-input border-border focus-visible:ring-gold"
                    defaultValue="demo12345"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-muted-foreground">
                  <input type="checkbox" className="accent-[oklch(0.80_0.14_85)]" />
                  Manter conectado
                </label>
                <a href="#" className="text-gold hover:underline">
                  Esqueceu a senha?
                </a>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold font-semibold gap-2"
              >
                Acessar sistema
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border text-center text-xs text-muted-foreground">
              Versão 1.0.0 •{" "}
              <Link to="/" className="text-gold hover:underline">
                Acesso de demonstração
              </Link>
            </div>
          </div>

          <p className="text-center text-[11px] text-muted-foreground mt-6">
            Conformidade LGPD • Dados protegidos por criptografia • Acesso auditado
          </p>
        </div>
      </div>
    </div>
  );
}
