import { schedules } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";

export const overdueTasksTask = schedules.task({
  id: "overdue-tasks-check",
  // Every day at 8 AM UTC
  cron: "0 8 * * *",
  run: async () => {
    const now = new Date();

    const overdueTasks = await prisma.task.findMany({
      where: {
        dueDate: { lt: now },
        status: { notIn: ["COMPLETED", "POSTPONED"] },
      },
      include: {
        sender: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    if (overdueTasks.length === 0) {
      await prisma.automationLog.create({
        data: {
          type: "OVERDUE_CHECK",
          status: "SUCCESS",
          message: "No overdue tasks found",
          payload: { count: 0 },
        },
      });
      return { notified: 0 };
    }

    // Find tasks already notified to avoid sending duplicates on subsequent runs
    const alreadyNotified = await prisma.notification.findMany({
      where: {
        type: "TASK_OVERDUE",
        taskId: { in: overdueTasks.map((t) => t.id) },
      },
      select: { taskId: true },
    });

    const notifiedTaskIds = new Set(alreadyNotified.map((n) => n.taskId));
    const newlyOverdue = overdueTasks.filter((t) => !notifiedTaskIds.has(t.id));

    if (newlyOverdue.length === 0) {
      await prisma.automationLog.create({
        data: {
          type: "OVERDUE_CHECK",
          status: "SUCCESS",
          message: `${overdueTasks.length} overdue task(s) — all already notified`,
          payload: { total: overdueTasks.length, newlyOverdue: 0 },
        },
      });
      return { notified: 0 };
    }

    const notifications = newlyOverdue.flatMap((task) => {
      const dueStr = task.dueDate!.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      return [
        {
          userId: task.assigneeId,
          type: "TASK_OVERDUE" as const,
          title: "Task overdue",
          message: `"${task.title}" was due on ${dueStr} and is now overdue.`,
          taskId: task.id,
        },
        ...(task.senderId !== task.assigneeId
          ? [
              {
                userId: task.senderId,
                type: "TASK_OVERDUE" as const,
                title: "Task overdue",
                message: `"${task.title}" assigned to ${task.assignee.name} was due on ${dueStr}.`,
                taskId: task.id,
              },
            ]
          : []),
      ];
    });

    await prisma.notification.createMany({ data: notifications });

    await prisma.automationLog.create({
      data: {
        type: "OVERDUE_CHECK",
        status: "SUCCESS",
        message: `Sent overdue notifications for ${newlyOverdue.length} task(s)`,
        payload: {
          total: overdueTasks.length,
          newlyOverdue: newlyOverdue.length,
          notificationsSent: notifications.length,
        },
      },
    });

    return { notified: newlyOverdue.length };
  },
});
