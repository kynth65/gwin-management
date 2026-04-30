import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";

export async function createNotification({
  userId,
  type,
  title,
  message,
  taskId,
}: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  taskId?: string;
}) {
  return prisma.notification.create({
    data: { userId, type, title, message, taskId: taskId ?? null },
  });
}
