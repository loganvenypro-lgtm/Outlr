"use client";

import { usePathname } from "next/navigation";
import { ExplorerHeader } from "@/components/explorer/explorer-ui";
import { navTrail } from "@/components/nav-config";

interface TopNavProps {
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

/** Header of the older pages: same bar as the explorers, plus the quick search they always had. */
export function TopNav({ title = "Dashboard", breadcrumbs }: TopNavProps) {
  const pathname = usePathname();
  // Pages from the sidebar take its labels; the others keep their own trail, minus the "Dashboard" root.
  const crumbs = navTrail(pathname)?.crumbs ?? breadcrumbs?.filter((b, i) => !(i === 0 && b.label === "Dashboard"));

  return <ExplorerHeader title={title} breadcrumbs={crumbs?.length ? crumbs : undefined} search />;
}
