"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, ShieldCheck } from "lucide-react";

type RoleRow = {
  id: string;
  name: string;
  isAdmin: boolean;
  description: string | null;
  createdAt: Date;
  _count: { users: number };
};

export function RolesTable({ roles: initial }: { roles: RoleRow[] }) {
  const [roles, setRoles] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete role "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/roles/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setRoles((r) => r.filter((x) => x.id !== id));
      toast.success(`Role "${name}" deleted`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete role");
    } finally {
      setDeleting(null);
    }
  }

  if (roles.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-6 text-sm text-muted-foreground">
        No roles yet. Add one below.
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role Name</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Permissions</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Users</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3 font-medium">{role.name}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {role.description ?? <span className="italic">No description</span>}
              </td>
              <td className="px-4 py-3">
                {role.isAdmin ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                    <ShieldCheck className="h-3 w-3" />
                    Admin
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                    Standard
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{role._count.users}</td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => handleDelete(role.id, role.name)}
                  disabled={deleting === role.id || role._count.users > 0}
                  className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title={role._count.users > 0 ? "Cannot delete: role has users" : "Delete role"}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
