import { formatDateTime } from "@/lib/utils";
import type { AutomationLog } from "@prisma/client";

const statusConfig = {
  SUCCESS: { label: "Success", class: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  FAILED: { label: "Failed", class: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  PENDING: { label: "Pending", class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
};

export function AutomationsList({ logs }: { logs: AutomationLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-8 text-center text-muted-foreground">
        No automation logs yet. Trigger a sync or export to see activity here.
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="border-b bg-muted/50">
          <tr>
            {["Type", "Status", "Message", "Date"].map((h) => (
              <th key={h} className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {logs.map((log) => {
            const config = statusConfig[log.status];
            return (
              <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-sm font-medium">{log.type}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.class}`}>
                    {config.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{log.message}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{formatDateTime(log.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
