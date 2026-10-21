import posthog from "posthog-js";
import { identifyCurrentUser } from "@/lib/analytics";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (key) {
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    defaults: "2025-05-24",
  });
  identifyCurrentUser();
}
