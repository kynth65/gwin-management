"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Zap,
  Settings,
  LogOut,
  Wind,
  Users,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { href: "/products", label: "Products", icon: Package, adminOnly: false },
  { href: "/orders", label: "Orders", icon: ShoppingCart, adminOnly: false },
  { href: "/automations", label: "Automations", icon: Zap, adminOnly: false },
  { href: "/users", label: "Users", icon: Users, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAdmin = status === "authenticated" && session?.user?.role === "ADMIN";

  useEffect(() => {
    navItems.forEach(({ href }) => router.prefetch(href));
  }, [router]);

  return (
    <aside className="w-64 min-h-screen bg-card border-r flex flex-col">
      <div className="p-6 flex items-center gap-2 border-b">
        <Wind className="h-6 w-6 text-primary" />
        <span className="font-bold text-lg">GWIN Mgmt</span>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon, adminOnly }) => {
          if (adminOnly && !isAdmin) return null;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                pathname.startsWith(href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
