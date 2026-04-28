import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminRole = await prisma.userRole.upsert({
    where: { name: "Admin" },
    update: { isAdmin: true },
    create: { id: "role_admin_default", name: "Admin", isAdmin: true },
  });

  await prisma.userRole.upsert({
    where: { name: "Staff" },
    update: { isAdmin: false },
    create: { id: "role_staff_default", name: "Staff", isAdmin: false },
  });

  const password = await hash("Admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@gwin.com" },
    update: {},
    create: {
      email: "admin@gwin.com",
      name: "Admin",
      password,
      roleId: adminRole.id,
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
