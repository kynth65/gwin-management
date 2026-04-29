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
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Failed to connect store");
        return;
      }
      toast.success("Store connected successfully!");
      reset();
      router.refresh();
    } catch {
      toast.error("Network error — please try again");
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
          placeholder="e.g. Gwin Main Store"
          className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Store URL</label>
        <input
          {...register("storeUrl")}
          placeholder="your-store.myshopify.com"
          autoComplete="off"
          className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Paste your Shopify store domain — e.g. <span className="font-mono">your-store.myshopify.com</span>. Full URLs are accepted too.
        </p>
        {errors.storeUrl && <p className="text-destructive text-xs mt-1">{errors.storeUrl.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Admin API Access Token</label>
        <input
          {...register("accessToken")}
          type="password"
          placeholder="shpat_xxxxxxxxxxxxxxxxxxxx"
          autoComplete="off"
          className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Found in Shopify Admin → Settings → Apps and sales channels → Develop apps → your app → API credentials.
        </p>
        {errors.accessToken && <p className="text-destructive text-xs mt-1">{errors.accessToken.message}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
      >
        {loading ? "Verifying & connecting..." : "Connect Store"}
      </button>
    </form>
  );
}
