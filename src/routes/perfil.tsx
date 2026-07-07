import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, LogOut, KeyRound, Save } from "lucide-react";
import { getCurrentProfile, getUserRoleLabel, updateCurrentProfile, type Profile } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { prepareImageForUpload, ImageTooLargeError } from "@/lib/image-upload";

export const Route = createFileRoute("/perfil")({
  beforeLoad: async () => {
    const profile = await getCurrentProfile();
    if (!profile) throw redirect({ to: "/login" });
  },
  component: PerfilPage,
  head: () => ({ meta: [{ title: "Meu perfil — Pátio Legal" }] }),
});

const AVATAR_BUCKET = "avatares";

function initials(nome: string) {
  const parts = nome.trim().split(" ").filter(Boolean);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : nome.slice(0, 2).toUpperCase();
}

function PerfilPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(true);

  const [savingNome, setSavingNome] = useState(false);
  const [nomeMsg, setNomeMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [savingSenha, setSavingSenha] = useState(false);
  const [senhaMsg, setSenhaMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [pushEnabled, setPushEnabled] = useState(true);
  const [biometryEnabled, setBiometryEnabled] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([supabase.auth.getUser(), getCurrentProfile()])
      .then(([{ data: { user } }, currentProfile]) => {
        setEmail(user?.email ?? "");
        setProfile(currentProfile);
        setNome(currentProfile?.nome ?? "");
        setPushEnabled(currentProfile?.notificacoes_push_habilitadas ?? true);
        setBiometryEnabled(currentProfile?.biometria_habilitada ?? false);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSaveNome = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nome.trim();
    if (!trimmed) {
      setNomeMsg({ type: "err", text: "Informe um nome válido." });
      return;
    }
    setSavingNome(true);
    setNomeMsg(null);
    try {
      const updated = await updateCurrentProfile({ nome: trimmed });
      setProfile(updated);
      setNomeMsg({ type: "ok", text: "Nome atualizado com sucesso." });
    } catch (err: any) {
      setNomeMsg({ type: "err", text: err.message ?? "Erro ao atualizar o nome." });
    } finally {
      setSavingNome(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !profile) return;

    setUploadingAvatar(true);
    setAvatarMsg(null);
    try {
      const prepared = await prepareImageForUpload(file);
      const storagePath = `${profile.id}/avatar_${Date.now()}.${prepared.filename.split(".").pop() || "jpg"}`;

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(storagePath, prepared.blob, { upsert: true, contentType: prepared.contentType });
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(storagePath);
      const updated = await updateCurrentProfile({ avatar_url: publicData.publicUrl });
      setProfile(updated);
      setAvatarMsg({ type: "ok", text: "Foto de perfil atualizada." });
    } catch (err: any) {
      const message = err instanceof ImageTooLargeError ? err.message : (err.message ?? "Erro ao enviar a foto.");
      setAvatarMsg({ type: "err", text: message });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha.length < 6) {
      setSenhaMsg({ type: "err", text: "A senha deve ter pelo menos 6 caracteres." });
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setSenhaMsg({ type: "err", text: "As senhas não coincidem." });
      return;
    }
    setSavingSenha(true);
    setSenhaMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;
      setNovaSenha("");
      setConfirmarSenha("");
      setSenhaMsg({ type: "ok", text: "Senha alterada com sucesso." });
    } catch (err: any) {
      setSenhaMsg({ type: "err", text: err.message ?? "Erro ao alterar a senha." });
    } finally {
      setSavingSenha(false);
    }
  };

  const handleTogglePush = async (checked: boolean) => {
    setPushEnabled(checked);
    setSavingPrefs(true);
    try {
      const updated = await updateCurrentProfile({ notificacoes_push_habilitadas: checked });
      setProfile(updated);
    } catch {
      setPushEnabled(!checked);
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleToggleBiometry = async (checked: boolean) => {
    setBiometryEnabled(checked);
    setSavingPrefs(true);
    try {
      const updated = await updateCurrentProfile({ biometria_habilitada: checked });
      setProfile(updated);
    } catch {
      setBiometryEnabled(!checked);
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Carregando perfil…</span>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Conta"
        title="Meu perfil"
        description="Gerencie seus dados pessoais, foto, senha e preferências de conta."
      />

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-gradient-card border border-border p-6 shadow-elegant space-y-4 lg:col-span-2">
          <h3 className="font-semibold text-lg">Foto e identificação</h3>
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="relative shrink-0">
              <Avatar className="h-20 w-20 border border-gold-subtle">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile?.nome ?? "Avatar"} />}
                <AvatarFallback className="bg-gradient-gold text-primary-foreground font-semibold text-xl">
                  {initials(nome || profile?.nome || "U")}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                aria-label="Alterar foto de perfil"
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-gradient-gold text-primary-foreground flex items-center justify-center shadow-gold hover:opacity-90 disabled:opacity-60"
              >
                {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{profile?.nome}</p>
              <p className="text-sm text-muted-foreground truncate">{email}</p>
              <p className="text-xs text-muted-foreground mt-1">{getUserRoleLabel(profile?.cargo)}</p>
              {profile?.matricula && <p className="text-xs text-muted-foreground">Matrícula {profile.matricula}</p>}
            </div>
          </div>
          {avatarMsg && (
            <p className={`text-sm rounded-lg px-3 py-2 border ${avatarMsg.type === "ok" ? "text-success bg-success/10 border-success/20" : "text-destructive bg-destructive/10 border-destructive/20"}`}>
              {avatarMsg.text}
            </p>
          )}
          <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP, até 15 MB. A imagem é redimensionada automaticamente.</p>
        </div>

        <div className="rounded-xl bg-gradient-card border border-border p-6 shadow-elegant space-y-4">
          <h3 className="font-semibold text-lg">Dados pessoais</h3>
          <form onSubmit={handleSaveNome} className="space-y-3">
            <div>
              <Label>Nome completo</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} className="bg-muted/40 mt-1" />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input value={email} disabled className="bg-muted/20 mt-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-1">O e-mail de acesso não pode ser alterado por aqui.</p>
            </div>
            {nomeMsg && (
              <p className={`text-sm rounded-lg px-3 py-2 border ${nomeMsg.type === "ok" ? "text-success bg-success/10 border-success/20" : "text-destructive bg-destructive/10 border-destructive/20"}`}>
                {nomeMsg.text}
              </p>
            )}
            <Button type="submit" disabled={savingNome} className="gap-2 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold">
              {savingNome ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar nome
            </Button>
          </form>
        </div>

        <div className="rounded-xl bg-gradient-card border border-border p-6 shadow-elegant space-y-4">
          <h3 className="font-semibold text-lg">Alterar senha</h3>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <Label>Nova senha</Label>
              <Input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="••••••••" className="bg-muted/40 mt-1" />
            </div>
            <div>
              <Label>Confirmar nova senha</Label>
              <Input type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} placeholder="••••••••" className="bg-muted/40 mt-1" />
            </div>
            {senhaMsg && (
              <p className={`text-sm rounded-lg px-3 py-2 border ${senhaMsg.type === "ok" ? "text-success bg-success/10 border-success/20" : "text-destructive bg-destructive/10 border-destructive/20"}`}>
                {senhaMsg.text}
              </p>
            )}
            <Button type="submit" disabled={savingSenha} className="gap-2 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold">
              {savingSenha ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Alterar senha
            </Button>
          </form>
        </div>

        <div className="rounded-xl bg-gradient-card border border-border p-6 shadow-elegant space-y-4 lg:col-span-2">
          <h3 className="font-semibold text-lg">Preferências de conta</h3>
          <p className="text-xs text-muted-foreground -mt-2">
            Sincronizadas com sua conta — valem também para o aplicativo móvel Pátio Legal.
          </p>
          <div className="flex items-start justify-between gap-4 py-2 border-b border-border">
            <div>
              <p className="font-medium text-sm">Notificações push</p>
              <p className="text-xs text-muted-foreground">Receber alertas de novos laudos e destruições.</p>
            </div>
            <Switch
              checked={pushEnabled}
              disabled={savingPrefs}
              onCheckedChange={handleTogglePush}
              className="data-[state=checked]:bg-gold"
            />
          </div>
          <div className="flex items-start justify-between gap-4 py-2">
            <div>
              <p className="font-medium text-sm">Login biométrico</p>
              <p className="text-xs text-muted-foreground">Usar biometria (digital/face) para entrar no aplicativo móvel.</p>
            </div>
            <Switch
              checked={biometryEnabled}
              disabled={savingPrefs}
              onCheckedChange={handleToggleBiometry}
              className="data-[state=checked]:bg-gold"
            />
          </div>
        </div>

        <div className="lg:col-span-2 flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
            className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sair da conta
          </Button>
        </div>
      </div>
    </>
  );
}
