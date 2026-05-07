"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";

type RoleOption = {
  id: string;
  name: string;
  isAdmin: boolean;
};

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Minimum 6 characters"),
  roleId: z.string().min(1, "Role is required"),
  hourlyRate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function AddUserForm({ roles }: { roles: RoleOption[] }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { roleId: roles[0]?.id ?? "", hourlyRate: "" },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const hourlyRate = data.hourlyRate && data.hourlyRate.trim() !== ""
        ? parseFloat(data.hourlyRate)
        : null;

      if (hourlyRate !== null && (isNaN(hourlyRate) || hourlyRate < 0)) {
        toast.error("Enter a valid hourly rate");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, hourlyRate }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`User "${data.name}" added successfully`);
      reset({ roleId: roles[0]?.id ?? "", hourlyRate: "" });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-card border rounded-lg p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <input
            {...register("name")}
            placeholder="Jane Doe"
            className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            {...register("email")}
            type="email"
            placeholder="jane@example.com"
            className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            {...register("password")}
            type="password"
            placeholder="Min. 6 characters"
            className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {errors.password && (
            <p className="text-destructive text-xs mt-1">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Role</label>
          <select
            {...register("roleId")}
            className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          {errors.roleId && (
            <p className="text-destructive text-xs mt-1">{errors.roleId.message}</p>
          )}
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">
            Hourly Pay Rate
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">(optional)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
              $
            </span>
            <input
              {...register("hourlyRate")}
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full pl-7 pr-12 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
              /hr
            </span>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
      >
        {loading ? "Adding..." : "Add User"}
      </button>
    </form>
  );
}
