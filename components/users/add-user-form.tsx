"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Minimum 6 characters"),
  role: z.enum(["ADMIN", "STAFF"]),
});

type FormData = z.infer<typeof schema>;

export function AddUserForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: "STAFF" },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`User "${data.name}" added successfully`);
      reset();
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
          {errors.password && <p className="text-destructive text-xs mt-1">{errors.password.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Role</label>
          <select
            {...register("role")}
            className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="STAFF">Staff</option>
            <option value="ADMIN">Admin</option>
          </select>
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
