"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";

const schema = z.object({
  name: z.string().min(1, "Store name is required"),
  storeUrl: z.string().min(1, "Store URL is required"),
  accessToken: z.string().min(1, "Access token is required"),
});

type FormData = z.infer<typeof schema>;

export function AddStoreForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, platform: "SHOPIFY" }),
      });
      if (!res.ok) throw new Error("Failed to add store");
      toast.success("Store connected successfully!");
      reset();
      router.refresh();
    } catch {
      toast.error("Failed to connect store");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-card border rounded-lg p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Store Name</label>
        <input
          {...register("name")}
          placeholder="My Shopify Store"
          className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Store URL</label>
        <input
          {...register("storeUrl")}
          placeholder="my-store.myshopify.com"
          className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {errors.storeUrl && <p className="text-destructive text-xs mt-1">{errors.storeUrl.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Access Token</label>
        <input
          {...register("accessToken")}
          type="password"
          placeholder="shpat_..."
          className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {errors.accessToken && <p className="text-destructive text-xs mt-1">{errors.accessToken.message}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
      >
        {loading ? "Connecting..." : "Connect Store"}
      </button>
    </form>
  );
}
