export const dynamic = 'force-dynamic';
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { AutomationsList } from "@/components/automations/automations-list";
import { ManualTriggers } from "@/components/automations/manual-triggers";
import { TableSkeleton } from "@/components/shared/skeletons";

async function getLogs() {
  return prisma.automationLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

async function AutomationsContent() {
  const logs = await getLogs();
  return <AutomationsList logs={logs} />;
}

export default async function AutomationsPage() {
  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      <ManualTriggers />
      <div>
        <h2 className="text-lg font-semibold mb-4">Automation Logs</h2>
        <Suspense fallback={<TableSkeleton rows={8} />}>
          <AutomationsContent />
        </Suspense>
      </div>
    </div>
  );
}
