"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
  createdAt: Date;
};

export function UsersTable({ users: initial, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const [users, setUsers] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();

  async function handleRoleChange(id: string, role: "ADMIN" | "STAFF") {
    const prev = users;
    setUsers((u) => u.map((x) => (x.id === id ? { ...x, role } : x)));
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error();
      toast.success("Role updated");
    } catch {
      setUsers(prev);
      toast.error("Failed to update role");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setUsers((u) => u.filter((x) => x.id !== id));
      toast.success("User deleted");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setDeleting(null);
    }
  }

  if (users.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-6 text-sm text-muted-foreground">
        No users yet. Add one below.
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3 font-medium">{user.name}</td>
              <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
              <td className="px-4 py-3">
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value as "ADMIN" | "STAFF")}
                  disabled={user.id === currentUserId}
                  className="px-2 py-1 rounded border text-xs font-medium bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="STAFF">STAFF</option>
                </select>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(user.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                {user.id !== currentUserId && (
                  <button
                    onClick={() => handleDelete(user.id)}
                    disabled={deleting === user.id}
                    className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    title="Delete user"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
