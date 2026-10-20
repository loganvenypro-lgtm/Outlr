"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
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
}: React.ComponentProps<"form">) {
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

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1.5 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isSignUp ? "Créer un compte Outlr" : "Connexion à votre compte"}
          </h1>
          <p className="text-sm text-balance text-muted-foreground">
            {isSignUp
              ? "Rejoignez la plateforme et explorez les niches YouTube virales."
              : "Entrez votre email et mot de passe pour accéder à votre radar."}
          </p>
        </div>

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
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>

        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
            {!isSignUp && (
              <a
                href="#"
                className="ml-auto text-xs text-muted-foreground underline-offset-4 hover:underline"
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
            className="w-full bg-slate-900 text-white hover:bg-slate-800 font-semibold py-2.5 rounded-xl transition-all cursor-pointer"
          >
            {loading && <Loader2 className="size-4 animate-spin mr-2" />}
            {isSignUp ? "Créer mon compte" : "Se connecter"}
          </Button>
        </Field>

        <FieldSeparator>Ou continuer avec</FieldSeparator>

        <Field>
          <Button variant="outline" type="button" className="w-full rounded-xl cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-4 mr-2">
              <path
                d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                fill="currentColor"
              />
            </svg>
            Continuer avec Google
          </Button>

          <FieldDescription className="text-center pt-2">
            {isSignUp ? (
              <>
                Déjà un compte ?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setError(null);
                  }}
                  className="font-semibold text-slate-900 underline underline-offset-4 cursor-pointer"
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
                  className="font-semibold text-slate-900 underline underline-offset-4 cursor-pointer"
                >
                  Créer un compte
                </button>
              </>
            )}
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
