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
            className="w-full justify-start gap-2.5 rounded-xl px-2 py-2 hover:bg-white/5 transition-colors"
          >
            {/* Vrai logo, sans fond */}
            <img
              src="/outlr-logo.png"
              alt="Outlr"
              className="h-7 w-auto shrink-0 object-contain"
            />
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
