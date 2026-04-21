import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await hash("Admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@gwin.com" },
    update: {},
    create: {
      email: "admin@gwin.com",
      name: "Admin",
      password,
      role: "ADMIN",
    },
  });

  console.log(`Seeded admin user: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
