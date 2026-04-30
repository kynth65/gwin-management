"use client";

import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { Moon, Sun, User, Menu } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { NotificationBell } from "@/components/notifications/notification-bell";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/orders": "Orders",
  "/automations": "Automations",
  "/settings": "Settings",
  "/users": "User Management",
  "/profile": "Profile",
};

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "GWIN Management";

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-4 shrink-0 gap-4 sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <NotificationBell />
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <Link
          href="/profile"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent px-2.5 py-1.5 rounded-md transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-primary/15 ring-2 ring-primary/30 flex items-center justify-center shrink-0">
            <User className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="hidden sm:block max-w-[120px] truncate font-medium">
            {session?.user?.name ?? "User"}
          </span>
        </Link>
      </div>
    </header>
  );
}
