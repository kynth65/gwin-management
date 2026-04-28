"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";

const schema = z.object({
  name: z.string().min(1, "Role name is required").max(50),
  description: z.string().max(200).optional(),
  isAdmin: z.boolean().default(false),
});

type FormData = z.infer<typeof schema>;

export function AddRoleForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { isAdmin: false },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`Role "${data.name}" created`);
      reset();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-card border rounded-lg p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Role Name</label>
          <input
            {...register("name")}
            placeholder="e.g. Warehouse Staff"
            className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <input
            {...register("description")}
            placeholder="Optional — what this role can do"
            className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {errors.description && (
            <p className="text-destructive text-xs mt-1">{errors.description.message}</p>
          )}
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer w-fit">
        <input
          {...register("isAdmin")}
          type="checkbox"
          className="rounded border focus:ring-2 focus:ring-primary"
        />
        <span className="text-sm font-medium">Grant admin privileges</span>
        <span className="text-xs text-muted-foreground">
          (full access to all management pages)
        </span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Role"}
      </button>
    </form>
  );
}
