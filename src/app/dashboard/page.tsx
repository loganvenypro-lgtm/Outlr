import { Suspense } from "react";
import { OutliersExplorer } from "@/components/outliers/outliers-explorer";

export default function DashboardPage() {
  return (
    <Suspense>
      <OutliersExplorer />
    </Suspense>
  );
}
