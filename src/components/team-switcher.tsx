"use client"

import * as React from "react"
import Link from "next/link"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function TeamSwitcher({
  teams,
}: {
  teams: {
    name: string
    plan: string
  }[]
}) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Link href="/" className="block w-full">
          <SidebarMenuButton
            size="lg"
            className="w-full justify-start rounded-2xl p-2.5 hover:bg-slate-50 transition-all border border-slate-200/60 bg-white shadow-xs group"
          >
            {/* Logo Image */}
            <div className="flex aspect-square size-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 p-1.5 shadow-sm group-hover:scale-105 transition-transform">
              <img
                src="/outlr-logo.png"
                alt="Outlr Logo"
                className="size-full object-contain"
              />
            </div>
            
            <div className="grid flex-1 text-left text-sm leading-tight pl-1">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-slate-900 tracking-tight text-[15px]">
                  Outlr
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-900 bg-lime-400 px-1.5 py-0.5 rounded-md">
                  PRO
                </span>
              </div>
              <span className="truncate text-[11px] font-medium text-slate-400">
                YouTube Viral Intelligence
              </span>
            </div>
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
