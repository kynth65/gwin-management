import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const storeSchema = z.object({
  name: z.string().min(1),
  storeUrl: z.string().min(1),
  accessToken: z.string().min(1),
  platform: z.enum(["SHOPIFY", "AMAZON"]),
});

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
  const parsed = storeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const store = await prisma.store.create({ data: parsed.data });
  return NextResponse.json(store, { status: 201 });
}
