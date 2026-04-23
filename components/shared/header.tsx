"use client";

import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { Moon, Sun, User } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/products": "Products",
  "/orders": "Orders",
  "/automations": "Automations",
  "/settings": "Settings",
  "/users": "User Management",
  "/profile": "Profile",
};

export function Header() {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const pathname = usePathname();

  const title = PAGE_TITLES[pathname] ?? "GWIN Management";

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6 shrink-0">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex items-center gap-4">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-md hover:bg-accent transition-colors"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <Link
          href="/profile"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent px-2 py-1.5 rounded-md transition-colors"
        >
          <User className="h-4 w-4" />
          <span>{session?.user?.name ?? "User"}</span>
        </Link>
      </div>
    </header>
  );
}
