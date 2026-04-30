"use client";

import { Zap } from "lucide-react";
import Link from "next/link";

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href="/automations"
        className="flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium hover:bg-accent hover:text-accent-foreground active:scale-95 transition-all"
      >
        <Zap className="h-4 w-4" />
        View Automations
      </Link>
    </div>
  );
}
