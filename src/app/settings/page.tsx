"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Database,
  Dices,
  Key,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Palette,
  RotateCcw,
  Shield,
  Sparkles,
  User,
  UserCog,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AVATAR_STYLES, getDicebearAvatar } from "@/lib/avatar";
import { emitUserUpdated } from "@/lib/user-events";
import { useTheme } from "@/lib/theme";
import { ThemeToggle } from "@/components/theme-toggle";
import { ClaudeConnect } from "@/components/claude-connect";
import { cn } from "@/lib/utils";

interface SessionUser {
  id: string;
  email: string;
  name: string;
  plan: string;
  avatar: string;
  createdAt?: string | null;
}

type Status = { type: "success" | "error"; message: string } | null;

// Read style + seed back from a DiceBear URL so the picker starts on the current avatar
function parseAvatar(url: string | undefined, fallbackSeed: string) {
  try {
    if (url) {
      const parsed = new URL(url);
      const style = parsed.pathname.split("/")[2];
      if (parsed.hostname === "api.dicebear.com" && AVATAR_STYLES.some((s) => s.id === style)) {
        return { style, seed: parsed.searchParams.get("seed") || fallbackSeed };
      }
    }
  } catch {
    // Not a DiceBear URL, fall back to defaults
  }
  return { style: AVATAR_STYLES[0].id as string, seed: fallbackSeed };
}

function randomSeed() {
  return Math.random().toString(36).slice(2, 10);
}

function StatusMessage({ status }: { status: Status }) {
  if (!status) return null;
  const isSuccess = status.type === "success";
  return (
    <p
      role="status"
      className={cn(
        "flex items-center gap-1.5 text-sm",
        isSuccess ? "text-emerald-600" : "text-rose-600"
      )}
    >
      {isSuccess ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
      {status.message}
    </p>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  // `/settings?tab=claude` opens a tab directly; the tabs only render after the session loads, client-side
  const [initialTab] = useState(() =>
    typeof window === "undefined" ? "profile" : new URLSearchParams(window.location.search).get("tab") ?? "profile"
  );

  // Profile form
  const [name, setName] = useState("");
  const [avatarStyle, setAvatarStyle] = useState<string>(AVATAR_STYLES[0].id);
  const [avatarSeed, setAvatarSeed] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState<Status>(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<Status>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((d) => {
        if (d.authenticated && d.user) {
          const u: SessionUser = d.user;
          setUser(u);
          setName(u.name);
          const parsed = parseAvatar(u.avatar, u.email);
          setAvatarStyle(parsed.style);
          setAvatarSeed(parsed.seed);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const avatarPreview = useMemo(
    () => getDicebearAvatar(avatarSeed || user?.email || "outlr", avatarStyle),
    [avatarSeed, avatarStyle, user?.email]
  );

  const isProfileDirty = !!user && (name.trim() !== user.name || avatarPreview !== user.avatar);

  const memberSince = user?.createdAt
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(
        new Date(user.createdAt)
      )
    : null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    setProfileStatus(null);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), avatar: avatarPreview }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible d'enregistrer le profil.");
      setUser((prev) => (prev ? { ...prev, ...data.user } : prev));
      emitUserUpdated({ name: data.user.name, email: data.user.email, avatar: data.user.avatar });
      setProfileStatus({ type: "success", message: "Profil mis à jour." });
    } catch (err) {
      setProfileStatus({ type: "error", message: (err as Error).message });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleResetProfile = () => {
    if (!user) return;
    setName(user.name);
    const parsed = parseAvatar(user.avatar, user.email);
    setAvatarStyle(parsed.style);
    setAvatarSeed(parsed.seed);
    setProfileStatus(null);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);
    if (newPassword.length < 8) {
      setPasswordStatus({ type: "error", message: "Le nouveau mot de passe doit contenir au moins 8 caractères." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: "error", message: "Les deux mots de passe ne correspondent pas." });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible de changer le mot de passe.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordStatus({ type: "success", message: "Mot de passe modifié." });
    } catch (err) {
      setPasswordStatus({ type: "error", message: (err as Error).message });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/me", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-full w-full bg-slate-50/60 pb-24 text-slate-900">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 md:px-10">
        <header className="pb-6 pt-8 md:pt-10">
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-900">Paramètres</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gère ton profil, ta sécurité et les intégrations d&apos;Outlr.
          </p>
        </header>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-9 w-80 rounded-lg" />
            <Skeleton className="h-[420px] w-full rounded-2xl" />
          </div>
        ) : !user ? (
          <Card className="rounded-2xl py-10 shadow-xs ring-slate-200/80">
            <CardContent className="flex flex-col items-center gap-3 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <User className="size-5" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Connecte-toi pour modifier ton profil</p>
                <p className="text-sm text-muted-foreground">Ton nom, ta photo et ton mot de passe se gèrent ici.</p>
              </div>
              <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "mt-1 rounded-xl px-4")}>
                Se connecter
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue={initialTab} className="gap-5">
            <TabsList className="h-10 w-full justify-start bg-white p-1 shadow-xs ring-1 ring-slate-200/80 sm:w-fit">
              <TabsTrigger value="profile" className="px-3">
                <User />
                Profil
              </TabsTrigger>
              <TabsTrigger value="security" className="px-3">
                <Lock />
                Sécurité
              </TabsTrigger>
              <TabsTrigger value="appearance" className="px-3">
                <Palette />
                Apparence
              </TabsTrigger>
              <TabsTrigger value="claude" className="px-3">
                <Sparkles />
                Claude
              </TabsTrigger>
              <TabsTrigger value="integrations" className="px-3">
                <Key />
                Intégrations
              </TabsTrigger>
              <TabsTrigger value="account" className="px-3">
                <UserCog />
                Compte
              </TabsTrigger>
            </TabsList>

            {/* PROFIL */}
            <TabsContent value="profile">
              <form onSubmit={handleSaveProfile}>
                <Card className="rounded-2xl shadow-xs ring-slate-200/80">
                  <CardHeader className="px-6">
                    <CardTitle className="text-[15px] font-semibold">Photo de profil</CardTitle>
                    <CardDescription className="text-sm">
                      Choisis un style d&apos;avatar, puis relance le tirage jusqu&apos;à trouver celui qui te plaît.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 px-6">
                    <div className="flex flex-col items-center gap-5 sm:flex-row">
                      <Avatar className="size-24 ring-4 ring-slate-100">
                        <AvatarImage src={avatarPreview} alt="Aperçu de l'avatar" />
                        <AvatarFallback className="text-2xl">{name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-center gap-2 sm:items-start">
                        <p className="text-lg font-semibold text-slate-900">{name || user.name}</p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            className="rounded-xl bg-white"
                            onClick={() => setAvatarSeed(randomSeed())}
                          >
                            <Dices />
                            Nouveau tirage
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="lg"
                            className="rounded-xl text-slate-600"
                            onClick={() => setAvatarSeed(user.email)}
                          >
                            <RotateCcw />
                            Avatar par défaut
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Style</Label>
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                        {AVATAR_STYLES.map((style) => {
                          const selected = style.id === avatarStyle;
                          return (
                            <button
                              key={style.id}
                              type="button"
                              onClick={() => setAvatarStyle(style.id)}
                              aria-pressed={selected}
                              className={cn(
                                "flex flex-col items-center gap-1.5 rounded-xl border bg-white p-2 transition-all",
                                selected
                                  ? "border-emerald-500 ring-3 ring-emerald-500/15"
                                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                              )}
                            >
                              <img
                                src={getDicebearAvatar(avatarSeed || user.email, style.id)}
                                alt=""
                                className="size-11 rounded-full"
                                loading="lazy"
                              />
                              <span
                                className={cn(
                                  "text-[11px] font-medium",
                                  selected ? "text-emerald-700" : "text-slate-500"
                                )}
                              >
                                {style.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                          Nom affiché
                        </Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          maxLength={60}
                          className="h-10 rounded-xl bg-white"
                        />
                        <p className="text-xs text-muted-foreground">Visible dans la sidebar et sur ton dashboard.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                          Email
                        </Label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                          <Input id="email" value={user.email} disabled className="h-10 rounded-xl pl-9" />
                        </div>
                        <p className="text-xs text-muted-foreground">L&apos;email sert d&apos;identifiant et ne peut pas être modifié.</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="justify-between gap-3 rounded-b-2xl border-slate-100 bg-slate-50/70 px-6 py-4">
                    <StatusMessage status={profileStatus} />
                    <div className="ml-auto flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="lg"
                        disabled={!isProfileDirty || savingProfile}
                        onClick={handleResetProfile}
                      >
                        Annuler
                      </Button>
                      <Button type="submit" size="lg" className="rounded-xl px-4" disabled={!isProfileDirty || savingProfile}>
                        {savingProfile && <Loader2 className="animate-spin" />}
                        Enregistrer
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </form>
            </TabsContent>

            {/* SÉCURITÉ */}
            <TabsContent value="security">
              <form onSubmit={handleChangePassword}>
                <Card className="rounded-2xl shadow-xs ring-slate-200/80">
                  <CardHeader className="px-6">
                    <CardTitle className="text-[15px] font-semibold">Mot de passe</CardTitle>
                    <CardDescription className="text-sm">
                      Utilise au moins 8 caractères. Tu restes connecté après le changement.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 px-6 sm:max-w-md">
                    <div className="space-y-2">
                      <Label htmlFor="current-password" className="text-sm font-medium text-slate-700">
                        Mot de passe actuel
                      </Label>
                      <Input
                        id="current-password"
                        type="password"
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="h-10 rounded-xl bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password" className="text-sm font-medium text-slate-700">
                        Nouveau mot de passe
                      </Label>
                      <Input
                        id="new-password"
                        type="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-10 rounded-xl bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-sm font-medium text-slate-700">
                        Confirmer le nouveau mot de passe
                      </Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-10 rounded-xl bg-white"
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="justify-between gap-3 rounded-b-2xl border-slate-100 bg-slate-50/70 px-6 py-4">
                    <StatusMessage status={passwordStatus} />
                    <Button
                      type="submit"
                      size="lg"
                      className="ml-auto rounded-xl px-4"
                      disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                    >
                      {savingPassword && <Loader2 className="animate-spin" />}
                      Changer le mot de passe
                    </Button>
                  </CardFooter>
                </Card>
              </form>
            </TabsContent>

            {/* INTÉGRATIONS */}
            {/* APPARENCE */}
            <TabsContent value="appearance">
              <Card className="rounded-2xl shadow-xs ring-slate-200/80">
                <CardHeader className="px-6">
                  <CardTitle className="text-[15px] font-semibold">Thème</CardTitle>
                  <CardDescription className="text-sm">
                    Choisis l&apos;apparence du tableau de bord. Le choix est gardé sur cet appareil.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-6">
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{theme === "dark" ? "Mode sombre" : "Mode clair"}</p>
                      <p className="text-xs text-muted-foreground">Clique pour passer en mode {theme === "dark" ? "clair" : "sombre"}.</p>
                    </div>
                    <ThemeToggle />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="claude">
              <ClaudeConnect />
            </TabsContent>

            <TabsContent value="integrations" className="space-y-4">
              <Card className="rounded-2xl shadow-xs ring-slate-200/80">
                <CardHeader className="px-6">
                  <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
                    <Key className="size-4 text-amber-500" />
                    YouTube Data API
                  </CardTitle>
                  <CardDescription className="text-sm">
                    La clé est configurée côté serveur via la variable <code className="text-xs">YOUTUBE_API_KEY</code>.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-6">
                  <Badge variant="secondary" className="h-6 bg-emerald-50 px-2.5 text-emerald-700">
                    <Shield />
                    Clé active et protégée côté serveur
                  </Badge>
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-xs ring-slate-200/80">
                <CardHeader className="px-6">
                  <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
                    <Bell className="size-4 text-indigo-500" />
                    Alertes Discord
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Les outliers détectés (plus de 2,5x la médiane) sont envoyés automatiquement sur Discord.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 px-6">
                  <Label htmlFor="discord-webhook" className="text-sm font-medium text-slate-700">
                    URL du webhook
                  </Label>
                  <Input
                    id="discord-webhook"
                    type="password"
                    defaultValue="https://discord.com/api/webhooks/***"
                    disabled
                    className="h-10 rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">Configurée côté serveur, non modifiable depuis l&apos;interface.</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-xs ring-slate-200/80">
                <CardHeader className="px-6">
                  <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
                    <Database className="size-4 text-cyan-600" />
                    Moteur de découverte
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Exploration automatique des tendances et des vidéos à fort ratio vues/abonnés.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-6">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
                    <span className="text-slate-600">Mode d&apos;exécution</span>
                    <span className="font-medium text-slate-900">Cloud serverless hybride</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* COMPTE */}
            <TabsContent value="account" className="space-y-4">
              <Card className="rounded-2xl shadow-xs ring-slate-200/80">
                <CardHeader className="px-6">
                  <CardTitle className="text-[15px] font-semibold">Ton compte</CardTitle>
                  <CardDescription className="text-sm">Les informations liées à ton abonnement.</CardDescription>
                </CardHeader>
                <CardContent className="divide-y divide-slate-100 px-6">
                  {[
                    {
                      label: "Abonnement",
                      value: (
                        <Badge className="h-6 bg-slate-900 px-2.5 text-white">{user.plan || "Pro"}</Badge>
                      ),
                    },
                    { label: "Email", value: user.email },
                    ...(memberSince ? [{ label: "Membre depuis", value: memberSince }] : []),
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-4 py-3 text-sm">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-medium text-slate-900">{row.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-xs ring-slate-200/80">
                <CardContent className="flex flex-col gap-3 px-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Se déconnecter</p>
                    <p className="text-sm text-muted-foreground">Ferme ta session sur cet appareil.</p>
                  </div>
                  <Button variant="destructive" size="lg" className="rounded-xl px-4" onClick={handleLogout}>
                    <LogOut />
                    Déconnexion
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
