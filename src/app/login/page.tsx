"use client"

import { LoginForm } from "@/components/login-form"
import { Flame } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-slate-50 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center gap-2.5 self-center font-bold text-slate-900 group">
          <div className="flex size-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Flame className="size-4 fill-white" />
          </div>
          <span className="text-xl tracking-tight font-black">Outlr</span>
        </Link>
        <LoginForm />
      </div>
    </div>
  )
}
