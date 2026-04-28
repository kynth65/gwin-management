import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const SINGLETON_ID = "singleton";

const DEFAULT_CONFIG = {
  id: SINGLETON_ID,
  businessName: "GWIN Management",
  primaryColor: "#761f7f",
  iconUrl: null,
};

export async function GET() {
  const config = await prisma.businessConfig.findUnique({ where: { id: SINGLETON_ID } });
  return NextResponse.json(config ?? DEFAULT_CONFIG);
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { businessName, primaryColor, iconUrl } = body;

  const config = await prisma.businessConfig.upsert({
    where: { id: SINGLETON_ID },
    update: {
      ...(businessName !== undefined && { businessName }),
      ...(primaryColor !== undefined && { primaryColor }),
      ...(iconUrl !== undefined && { iconUrl }),
    },
    create: {
      id: SINGLETON_ID,
      businessName: businessName ?? DEFAULT_CONFIG.businessName,
      primaryColor: primaryColor ?? DEFAULT_CONFIG.primaryColor,
      iconUrl: iconUrl ?? null,
    },
  });

  return NextResponse.json(config);
}
