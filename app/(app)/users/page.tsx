export const dynamic = "force-dynamic";
import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UsersPageClient } from "@/components/users/users-page-client";
import { RolesTable } from "@/components/users/roles-table";
import { AddRoleForm } from "@/components/users/add-role-form";
import { TableSkeleton } from "@/components/shared/skeletons";

async function getUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      hourlyRate: true,
      role: { select: { id: true, name: true, isAdmin: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return users.map((u) => ({
    ...u,
    hourlyRate: u.hourlyRate !== null ? Number(u.hourlyRate) : null,
  }));
}

async function getRoles() {
  return prisma.userRole.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true } } },
  });
}

async function UsersContent({ currentUserId }: { currentUserId: string }) {
  const [users, roles] = await Promise.all([getUsers(), getRoles()]);
  return (
    <UsersPageClient
      initialUsers={users}
      roles={roles}
      currentUserId={currentUserId}
    />
  );
}

async function RolesContent() {
  const roles = await getRoles();
  return <RolesTable roles={roles} />;
}

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.isAdmin) redirect("/dashboard");

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="space-y-8">
        <Suspense fallback={<TableSkeleton rows={6} />}>
          <UsersContent currentUserId={session.user.id} />
        </Suspense>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
          <div />

          <div>
            <h2 className="text-lg font-semibold mb-1">Role Management</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Define the roles users can be assigned to. Roles with admin privileges have full access.
            </p>
            <Suspense fallback={<TableSkeleton rows={3} />}>
              <RolesContent />
            </Suspense>
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-3">Add New Role</h3>
              <AddRoleForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
