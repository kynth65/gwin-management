import { ShoppingCart, FileSpreadsheet, RefreshCw } from "lucide-react";

interface DashboardCardsProps {
  totalOrders: number;
  pendingExports: number;
  lastSyncAt: string;
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
}) {
  return (
    <div className="bg-card border rounded-xl p-5 flex items-start justify-between hover:shadow-md transition-shadow group">
      <div className="space-y-1 min-w-0 flex-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
        )}
      </div>
      <div className="p-2.5 bg-primary/10 rounded-xl shrink-0 ml-4 group-hover:bg-primary/15 transition-colors">
        <Icon className="h-5 w-5 text-primary" />
      </div>
    </div>
  );
}

export function DashboardCards({
  totalOrders,
  pendingExports,
  lastSyncAt,
}: DashboardCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard title="Total Orders" value={totalOrders} icon={ShoppingCart} />
      <StatCard
        title="Pending Exports"
        value={pendingExports}
        icon={FileSpreadsheet}
      />
      <StatCard
        title="Last Sync"
        value="Shopify"
        icon={RefreshCw}
        description={lastSyncAt}
      />
    </div>
  );
}
