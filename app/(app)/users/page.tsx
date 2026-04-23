export const dynamic = "force-dynamic";
import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UsersTable } from "@/components/users/users-table";
import { AddUserForm } from "@/components/users/add-user-form";
import { TableSkeleton } from "@/components/shared/skeletons";

async function getUsers() {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

async function UsersContent({ currentUserId }: { currentUserId: string }) {
  const users = await getUsers();
  return <UsersTable users={users} currentUserId={currentUserId} />;
}

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="flex-1 p-6 space-y-8 overflow-auto max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold mb-4">All Users</h2>
        <Suspense fallback={<TableSkeleton rows={6} />}>
          <UsersContent currentUserId={session.user.id} />
        </Suspense>
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-4">Add New User</h2>
        <AddUserForm />
      </div>
    </div>
  );
}
