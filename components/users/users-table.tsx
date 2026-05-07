"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Pencil, Trash2, X } from "lucide-react";

type RoleOption = {
  id: string;
  name: string;
  isAdmin: boolean;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  hourlyRate: number | null;
  role: RoleOption;
  createdAt: Date;
};

export function UsersTable({
  users: initial,
  roles,
  currentUserId,
}: {
  users: UserRow[];
  roles: RoleOption[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingPayRate, setEditingPayRate] = useState<string | null>(null);
  const [payRateInput, setPayRateInput] = useState("");
  const [savingPayRate, setSavingPayRate] = useState<string | null>(null);
  const router = useRouter();

  async function handleRoleChange(id: string, roleId: string) {
    const prev = users;
    const newRole = roles.find((r) => r.id === roleId);
    if (!newRole) return;
    setUsers((u) => u.map((x) => (x.id === id ? { ...x, role: newRole } : x)));
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Role updated");
    } catch {
      setUsers(prev);
      toast.error("Failed to update role");
    }
  }

  function startEditPayRate(user: UserRow) {
    setEditingPayRate(user.id);
    setPayRateInput(user.hourlyRate !== null ? String(user.hourlyRate) : "");
  }

  async function handlePayRateSave(id: string) {
    const raw = payRateInput.trim();
    const value = raw === "" ? null : parseFloat(raw);
    if (value !== null && (isNaN(value) || value < 0)) {
      toast.error("Enter a valid hourly rate");
      return;
    }
    setSavingPayRate(id);
    const prev = users;
    setUsers((u) => u.map((x) => (x.id === id ? { ...x, hourlyRate: value } : x)));
    setEditingPayRate(null);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hourlyRate: value }),
      });
      if (!res.ok) throw new Error();
      toast.success("Pay rate updated");
    } catch {
      setUsers(prev);
      toast.error("Failed to update pay rate");
    } finally {
      setSavingPayRate(null);
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
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Pay Rate</th>
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
                  value={user.role.id}
                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  disabled={user.id === currentUserId}
                  className="px-2 py-1 rounded border text-xs font-medium bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3">
                {editingPayRate === user.id ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={payRateInput}
                      onChange={(e) => setPayRateInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handlePayRateSave(user.id);
                        if (e.key === "Escape") setEditingPayRate(null);
                      }}
                      className="w-20 px-2 py-1 rounded border text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      autoFocus
                    />
                    <span className="text-xs text-muted-foreground">/hr</span>
                    <button
                      onClick={() => handlePayRateSave(user.id)}
                      className="p-1 text-green-600 hover:bg-green-500/10 rounded transition-colors"
                      title="Save"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingPayRate(null)}
                      className="p-1 text-muted-foreground hover:bg-muted rounded transition-colors"
                      title="Cancel"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startEditPayRate(user)}
                    disabled={savingPayRate === user.id}
                    className="flex items-center gap-2 text-sm hover:text-foreground transition-colors disabled:opacity-50"
                    title="Edit pay rate"
                  >
                    <span className={user.hourlyRate !== null ? "font-mono tabular-nums" : "text-muted-foreground"}>
                      {user.hourlyRate !== null ? `$${user.hourlyRate.toFixed(2)}/hr` : "Not set"}
                    </span>
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </button>
                )}
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
