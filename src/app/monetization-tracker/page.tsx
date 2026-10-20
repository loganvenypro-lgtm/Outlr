import { Suspense } from "react";
import { MonetizationTracker } from "@/components/monetization/monetization-tracker";

export default function MonetizationTrackerPage() {
  return (
    <Suspense>
      <MonetizationTracker />
    </Suspense>
  );
}
