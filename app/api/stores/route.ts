import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const API_VERSION = "2024-10";

const storeSchema = z.object({
  name: z.string().min(1),
  storeUrl: z.string().min(1),
  accessToken: z.string().min(1),
  platform: z.enum(["SHOPIFY", "AMAZON"]),
});

function normalizeShopifyUrl(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
}

async function verifyShopifyCredentials(storeUrl: string, accessToken: string): Promise<{ ok: boolean; shopName?: string }> {
  try {
    const res = await fetch(
      `https://${storeUrl}/admin/api/${API_VERSION}/shop.json`,
      {
        headers: { "X-Shopify-Access-Token": accessToken },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return { ok: false };
    const data = await res.json() as { shop?: { name?: string } };
    return { ok: true, shopName: data.shop?.name };
  } catch {
    return { ok: false };
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stores = await prisma.store.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(stores);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = storeSchema.safeParse({
    ...body,
    storeUrl: body.storeUrl ? normalizeShopifyUrl(body.storeUrl) : body.storeUrl,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.platform === "SHOPIFY") {
    const { ok } = await verifyShopifyCredentials(parsed.data.storeUrl, parsed.data.accessToken);
    if (!ok) {
      return NextResponse.json(
        { error: "Could not connect to Shopify. Check the store URL and access token." },
        { status: 422 }
      );
    }
  }

  const existing = await prisma.store.findFirst({ where: { storeUrl: parsed.data.storeUrl } });
  if (existing) {
    return NextResponse.json({ error: "A store with this URL is already connected." }, { status: 409 });
  }

  const store = await prisma.store.create({ data: parsed.data });
  return NextResponse.json(store, { status: 201 });
}
