"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle } from "lucide-react";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = isSignUp ? "/api/auth/signup" : "/api/auth/login";
      const body = isSignUp ? { name, email, password } : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Une erreur est survenue.");
        return;
      }

      // Success -> Redirect to dashboard
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-slate-200/80 shadow-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">
            {isSignUp ? "Créer un compte Outlr" : "Bienvenue sur Outlr"}
          </CardTitle>
          <CardDescription className="text-slate-500 text-xs">
            {isSignUp
              ? "Rejoignez le radar d'outliers YouTube et commencez à détecter les niches à fort potentiel."
              : "Connectez-vous à votre espace créateur pour accéder au radar."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {error && (
                <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {isSignUp && (
                <Field>
                  <FieldLabel htmlFor="name">Nom complet ou pseudonyme</FieldLabel>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Logan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </Field>
              )}

              <Field>
                <FieldLabel htmlFor="email">Adresse Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="nom@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>

              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                  {!isSignUp && (
                    <a
                      href="#"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Mot de passe oublié ?
                    </a>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>

              <Field>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 font-bold py-2.5 rounded-xl shadow-md shadow-blue-500/20 text-white transition-all cursor-pointer"
                >
                  {loading && <Loader2 className="size-4 animate-spin mr-2" />}
                  {isSignUp ? "Créer mon compte" : "Se connecter"}
                </Button>

                <div className="text-center text-xs text-slate-500 pt-2">
                  {isSignUp ? (
                    <>
                      Vous avez déjà un compte ?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setIsSignUp(false);
                          setError(null);
                        }}
                        className="text-blue-600 font-semibold hover:underline cursor-pointer"
                      >
                        Se connecter
                      </button>
                    </>
                  ) : (
                    <>
                      Pas encore de compte ?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setIsSignUp(true);
                          setError(null);
                        }}
                        className="text-blue-600 font-semibold hover:underline cursor-pointer"
                      >
                        Créer un compte
                      </button>
                    </>
                  )}
                </div>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center text-[11px] text-slate-400">
        En continuant, vous acceptez nos <a href="#" className="underline">Conditions d&apos;utilisation</a> et notre <a href="#" className="underline">Politique de confidentialité</a>.
      </FieldDescription>
    </div>
  );
}
