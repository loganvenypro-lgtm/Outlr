"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignInPage } from "@/components/ui/sign-in";

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "");

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

      router.push(isSignUp ? "/onboarding" : "/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-foreground">
      <SignInPage
        mode={isSignUp ? "signup" : "signin"}
        logo={
          <Link href="/" className="inline-flex items-center gap-2.5 font-bold group">
            <div className="flex size-8 items-center justify-center rounded-xl bg-slate-950 p-1.5 shadow-sm group-hover:scale-105 transition-transform">
              <img src="/outlr-mark.png" alt="Outlr Logo" className="size-full object-contain" />
            </div>
            <span className="text-xl tracking-tight font-black">Outlr</span>
          </Link>
        }
        title={
          <span className="font-light text-foreground tracking-tighter">
            {isSignUp ? "Créer un compte" : "Bon retour"}
          </span>
        }
        description={
          isSignUp
            ? "Rejoignez la plateforme et explorez les niches YouTube virales."
            : "Entrez votre email et mot de passe pour accéder à votre radar."
        }
        heroImageSrc="/login-banner.jpg"
        error={error}
        loading={loading}
        onSignIn={handleSubmit}
        onToggleMode={() => {
          setIsSignUp((v) => !v);
          setError(null);
        }}
      />
    </div>
  );
}
