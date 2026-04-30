"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  Zap,
  Settings,
  LogOut,
  Wind,
  Users,
  X,
  ClipboardList,
} from "lucide-react";
import { useCustomization } from "@/components/customization/customization-context";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { href: "/orders", label: "Orders", icon: ShoppingCart, adminOnly: false },
  { href: "/tasks", label: "Tasks", icon: ClipboardList, adminOnly: false },
  { href: "/automations", label: "Automations", icon: Zap, adminOnly: false },
  { href: "/users", label: "Users", icon: Users, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: false },
];

interface SidebarProps {
  onClose?: () => void;
  isMobileOpen?: boolean;
}

export function Sidebar({ onClose, isMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAdmin = status === "authenticated" && session?.user?.isAdmin === true;
  const { config } = useCustomization();

  useEffect(() => {
    navItems.forEach(({ href }) => router.prefetch(href));
  }, [router]);

  return (
    <aside
      className={cn(
        "w-64 flex flex-col shadow-2xl",
        "fixed inset-y-0 left-0 z-40 h-full transition-transform duration-300 ease-in-out lg:transition-none",
        isMobileOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0 lg:h-screen lg:z-10"
      )}
      style={{
        background:
          "linear-gradient(to bottom, hsl(var(--sidebar-gradient-from)), hsl(var(--sidebar-gradient-to)))",
      }}
    >
      <div className="px-5 py-5 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md shrink-0">
            {config.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.iconUrl}
                alt="Business icon"
                className="w-full h-full rounded-lg object-cover"
              />
            ) : (
              <Wind className="h-5 w-5 text-white" />
            )}
          </div>
          <span className="font-bold text-white text-base tracking-wide truncate">
            {config.businessName}
          </span>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden text-white/60 hover:text-white transition-colors p-1 rounded"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, adminOnly }) => {
          if (adminOnly && !isAdmin) return null;
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary text-white shadow-lg"
                  : "text-white/65 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:bg-red-500/20 hover:text-red-300 transition-all duration-150"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
