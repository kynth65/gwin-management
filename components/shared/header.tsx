"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, User } from "lucide-react";
import { useSession } from "next-auth/react";

export function Header({ title }: { title: string }) {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex items-center gap-4">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-md hover:bg-accent transition-colors"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span>{session?.user?.name ?? "User"}</span>
        </div>
      </div>
    </header>
  );
}
