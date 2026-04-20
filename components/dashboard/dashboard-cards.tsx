import { Package, ShoppingCart, FileSpreadsheet, RefreshCw } from "lucide-react";

interface DashboardCardsProps {
  totalProducts: number;
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
    <div className="bg-card border rounded-lg p-6 flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="p-2 bg-primary/10 rounded-md">
        <Icon className="h-5 w-5 text-primary" />
      </div>
    </div>
  );
}

export function DashboardCards({
  totalProducts,
  totalOrders,
  pendingExports,
  lastSyncAt,
}: DashboardCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard title="Total Products" value={totalProducts} icon={Package} />
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
