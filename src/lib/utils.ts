import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCompactNumber(number?: number | null): string {
  if (number === undefined || number === null || isNaN(number)) return "0";
  return new Intl.NumberFormat("fr-FR", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(number);
}

export function formatFullNumber(number?: number | null): string {
  if (number === undefined || number === null || isNaN(number)) return "0";
  return new Intl.NumberFormat("fr-FR").format(number);
}

export function formatDate(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function parseISO8601Duration(duration: string | undefined): {
  seconds: number;
  formatted: string;
} {
  if (!duration) return { seconds: 0, formatted: "0:00" };

  const matches = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!matches) return { seconds: 0, formatted: "0:00" };

  const hours = parseInt(matches[1] || "0", 10);
  const minutes = parseInt(matches[2] || "0", 10);
  const seconds = parseInt(matches[3] || "0", 10);

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  let formatted = "";
  if (hours > 0) {
    formatted = `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  } else {
    formatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  return { seconds: totalSeconds, formatted };
}

export function extractEmails(text: string): string[] {
  if (!text) return [];
  const regex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
  const matches = text.match(regex);
  if (!matches) return [];
  return Array.from(new Set(matches.map((e) => e.toLowerCase())));
}
