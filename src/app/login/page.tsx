"use client";

import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2 bg-white">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2.5 font-bold group">
            <div className="flex size-8 items-center justify-center rounded-xl bg-slate-950 p-1.5 shadow-sm group-hover:scale-105 transition-transform">
              <img
                src="/outlr-logo.png"
                alt="Outlr Logo"
                className="size-full object-contain"
              />
            </div>
            <span className="text-xl tracking-tight font-black text-slate-900">
              Outlr
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-slate-950 lg:block overflow-hidden border-l border-slate-900">
        <img
          src="/login-banner.jpg"
          alt="Outlr Platform Showcase"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />
      </div>
    </div>
  );
}
