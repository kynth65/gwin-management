export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/profile/profile-form";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: { select: { name: true } }, createdAt: true },
  });

  if (!user) redirect("/login");

  return (
    <div className="flex-1 p-6 overflow-auto max-w-2xl">
      <ProfileForm
        initialName={user.name}
        email={user.email}
        role={user.role.name}
        createdAt={user.createdAt.toISOString()}
      />
    </div>
  );
}
