import { ShoppingCart, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface DashboardCardsProps {
  totalOrders: number;
  lastSyncAt: string;
  overdueTasks: number;
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  danger,
  href,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description: string;
  danger?: boolean;
  href?: string;
}) {
  const content = (
    <div
      className={cn(
        "bg-card border rounded-xl p-5 flex items-start justify-between hover:shadow-md transition-shadow group",
        danger && "border-red-200 dark:border-red-900/50"
      )}
    >
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p
          className={cn(
            "text-2xl font-bold",
            danger ? "text-red-600 dark:text-red-400" : "text-foreground"
          )}
        >
          {value}
        </p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      <div
        className={cn(
          "p-2.5 rounded-xl shrink-0 ml-4 transition-colors",
          danger
            ? "bg-red-100 dark:bg-red-950/50 group-hover:bg-red-100/80"
            : "bg-primary/10 group-hover:bg-primary/15"
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5",
            danger ? "text-red-600 dark:text-red-400" : "text-primary"
          )}
        />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

export function DashboardCards({
  totalOrders,
  lastSyncAt,
  overdueTasks,
}: DashboardCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        title="Total Orders"
        value={totalOrders}
        icon={ShoppingCart}
        description="All synced orders"
      />
      <StatCard
        title="Last Sync"
        value="Shopify"
        icon={RefreshCw}
        description={lastSyncAt}
      />
      <StatCard
        title="Overdue Tasks"
        value={overdueTasks}
        icon={AlertCircle}
        description={
          overdueTasks > 0
            ? `${overdueTasks} task${overdueTasks > 1 ? "s" : ""} past due date`
            : "All tasks on schedule"
        }
        danger={overdueTasks > 0}
        href={overdueTasks > 0 ? "/tasks" : undefined}
      />
    </div>
  );
}
