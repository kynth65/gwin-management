export const dynamic = "force-dynamic";
import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UsersTable } from "@/components/users/users-table";
import { AddUserForm } from "@/components/users/add-user-form";
import { RolesTable } from "@/components/users/roles-table";
import { AddRoleForm } from "@/components/users/add-role-form";
import { TableSkeleton } from "@/components/shared/skeletons";

async function getUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: { select: { id: true, name: true, isAdmin: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

async function getRoles() {
  return prisma.userRole.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true } } },
  });
}

async function UsersContent({ currentUserId }: { currentUserId: string }) {
  const [users, roles] = await Promise.all([getUsers(), getRoles()]);
  return <UsersTable users={users} roles={roles} currentUserId={currentUserId} />;
}

async function RolesContent() {
  const roles = await getRoles();
  return <RolesTable roles={roles} />;
}

async function AddUserContent() {
  const roles = await getRoles();
  return <AddUserForm roles={roles} />;
}

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.isAdmin) redirect("/dashboard");

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="space-y-8">
        {/* Users table — full width */}
        <div>
          <h2 className="text-lg font-semibold mb-4">All Users</h2>
          <Suspense fallback={<TableSkeleton rows={6} />}>
            <UsersContent currentUserId={session.user.id} />
          </Suspense>
        </div>

        {/* Add User + Role Management — 2-column on large screens */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
          <div>
            <h2 className="text-lg font-semibold mb-4">Add New User</h2>
            <Suspense fallback={<TableSkeleton rows={2} />}>
              <AddUserContent />
            </Suspense>
          </div>

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
