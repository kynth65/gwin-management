import { prisma } from "@/lib/prisma";
import { Header } from "@/components/shared/header";
import { AutomationsList } from "@/components/automations/automations-list";
import { ManualTriggers } from "@/components/automations/manual-triggers";

async function getLogs() {
  return prisma.automationLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export default async function AutomationsPage() {
  const logs = await getLogs();

  return (
    <>
      <Header title="Automations" />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <ManualTriggers />
        <div>
          <h2 className="text-lg font-semibold mb-4">Automation Logs</h2>
          <AutomationsList logs={logs} />
        </div>
      </div>
    </>
  );
}
