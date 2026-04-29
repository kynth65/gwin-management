"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const nameSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Minimum 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type NameFormData = z.infer<typeof nameSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

interface ProfileFormProps {
  initialName: string;
  email: string;
  role: string;
  createdAt: string;
}

export function ProfileForm({ initialName, email, role, createdAt }: ProfileFormProps) {
  const [nameLoading, setNameLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const router = useRouter();
  const { update } = useSession();

  const nameForm = useForm<NameFormData>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: initialName },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onUpdateName = async (data: NameFormData) => {
    setNameLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      // Push new name into the JWT so the header updates without re-login
      await update({ name: data.name });
      toast.success("Name updated successfully");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update name");
    } finally {
      setNameLoading(false);
    }
  };

  const onChangePassword = async (data: PasswordFormData) => {
    setPasswordLoading(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Password changed successfully");
      passwordForm.reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary";
  const labelClass = "block text-sm font-medium mb-1";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account details and security settings.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Left column: Account Overview */}
        <div className="bg-card border rounded-lg p-6 space-y-4">
          <h2 className="text-base font-semibold">Account Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium break-all">{email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Role</p>
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                  role === "ADMIN"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {role}
              </span>
            </div>
            <div>
              <p className="text-muted-foreground">Member since</p>
              <p className="font-medium">
                {new Date(createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Right column: Update Name + Change Password */}
        <div className="space-y-6">
          {/* Update Name */}
          <form
            onSubmit={nameForm.handleSubmit(onUpdateName)}
            className="bg-card border rounded-lg p-6 space-y-4"
          >
            <h2 className="text-base font-semibold">Display Name</h2>
            <div>
              <label className={labelClass}>Full Name</label>
              <input
                {...nameForm.register("name")}
                placeholder="Your name"
                className={inputClass}
              />
              {nameForm.formState.errors.name && (
                <p className="text-destructive text-xs mt-1">
                  {nameForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={nameLoading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {nameLoading ? "Saving..." : "Save Name"}
            </button>
          </form>

          {/* Change Password */}
          <form
            onSubmit={passwordForm.handleSubmit(onChangePassword)}
            className="bg-card border rounded-lg p-6 space-y-4"
          >
            <h2 className="text-base font-semibold">Change Password</h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Current Password</label>
                <input
                  {...passwordForm.register("currentPassword")}
                  type="password"
                  placeholder="Enter current password"
                  className={inputClass}
                />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-destructive text-xs mt-1">
                    {passwordForm.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>New Password</label>
                <input
                  {...passwordForm.register("newPassword")}
                  type="password"
                  placeholder="Min. 6 characters"
                  className={inputClass}
                />
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-destructive text-xs mt-1">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>Confirm New Password</label>
                <input
                  {...passwordForm.register("confirmPassword")}
                  type="password"
                  placeholder="Repeat new password"
                  className={inputClass}
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-destructive text-xs mt-1">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>
            <button
              type="submit"
              disabled={passwordLoading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {passwordLoading ? "Updating..." : "Change Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
