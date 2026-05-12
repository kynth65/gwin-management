import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";

export const getBusinessConfig = unstable_cache(
  async () => {
    return prisma.businessConfig.findUnique({ where: { id: "singleton" } });
  },
  ["business-config"],
  { revalidate: 300, tags: ["business-config"] }
);
