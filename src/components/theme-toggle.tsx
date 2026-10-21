"use client";

import { Moon, Sun } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Toggle
      variant="outline"
      className={cn("relative size-9 px-0 aria-pressed:bg-transparent aria-pressed:hover:bg-muted", className)}
      pressed={isDark}
      onPressedChange={(pressed) => setTheme(pressed ? "dark" : "light")}
      aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
    >
      <Moon
        size={16}
        strokeWidth={2}
        aria-hidden="true"
        className={cn("shrink-0 transition-all", isDark ? "scale-100 opacity-100" : "scale-0 opacity-0")}
      />
      <Sun
        size={16}
        strokeWidth={2}
        aria-hidden="true"
        className={cn("absolute shrink-0 transition-all", isDark ? "scale-0 opacity-0" : "scale-100 opacity-100")}
      />
    </Toggle>
  );
}
