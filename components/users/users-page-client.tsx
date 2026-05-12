"use client";

import { useState } from "react";
import { UsersTable } from "./users-table";
import { AddUserForm } from "./add-user-form";

type RoleOption = {
  id: string;
  name: string;
  isAdmin: boolean;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  hourlyRate: number | null;
  role: RoleOption;
  createdAt: Date;
};

export function UsersPageClient({
  initialUsers,
  roles,
  currentUserId,
}: {
  initialUsers: UserRow[];
  roles: RoleOption[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initialUsers);

  return (
    <>
      <div>
        <h2 className="text-lg font-semibold mb-4">All Users</h2>
        <UsersTable
          users={users}
          setUsers={setUsers}
          roles={roles}
          currentUserId={currentUserId}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        <div>
          <h2 className="text-lg font-semibold mb-4">Add New User</h2>
          <AddUserForm
            roles={roles}
            onSuccess={(newUser) =>
              setUsers((prev) => [newUser as UserRow, ...prev])
            }
          />
        </div>
      </div>
    </>
  );
}
