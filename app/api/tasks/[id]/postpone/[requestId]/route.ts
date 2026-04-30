import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string; requestId: string } };

export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const task = await prisma.task.findUnique({ where: { id: params.id } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  // Only the assigner (sender) or an admin can approve/reject
  const canReview = task.senderId === session.user.id || session.user.isAdmin;
  if (!canReview) {
    return NextResponse.json({ error: "Only the task assigner can review postpone requests" }, { status: 403 });
  }

  const postponeRequest = await prisma.postponeRequest.findUnique({
    where: { id: params.requestId },
  });
  if (!postponeRequest || postponeRequest.taskId !== params.id) {
    return NextResponse.json({ error: "Postpone request not found" }, { status: 404 });
  }
  if (postponeRequest.status !== "PENDING") {
    return NextResponse.json({ error: "This request has already been reviewed" }, { status: 400 });
  }

  const { action, assignerNote } = await req.json();
  if (action !== "APPROVE" && action !== "REJECT") {
    return NextResponse.json({ error: "action must be APPROVE or REJECT" }, { status: 400 });
  }

  const now = new Date();

  if (action === "APPROVE") {
    // Extend due date by extensionDays and set status to POSTPONED
    const newDueDate: Date | null = task.dueDate ? new Date(task.dueDate) : null;
    if (newDueDate) {
      newDueDate.setDate(newDueDate.getDate() + postponeRequest.extensionDays);
    }

    await prisma.$transaction([
      prisma.postponeRequest.update({
        where: { id: params.requestId },
        data: { status: "APPROVED", reviewerId: session.user.id, reviewedAt: now },
      }),
      prisma.task.update({
        where: { id: params.id },
        data: {
          status: "POSTPONED",
          ...(newDueDate ? { dueDate: newDueDate } : {}),
        },
      }),
    ]);

    await prisma.notification.create({
      data: {
        userId: postponeRequest.requesterId,
        type: "POSTPONE_APPROVED",
        title: "Postpone request approved",
        message: `Your ${postponeRequest.extensionDays}-day extension for "${task.title}" was approved${newDueDate ? `. New due date: ${newDueDate.toLocaleDateString()}` : ""}.`,
        taskId: task.id,
      },
    });
  } else {
    await prisma.postponeRequest.update({
      where: { id: params.requestId },
      data: {
        status: "REJECTED",
        assignerNote: assignerNote?.trim() || null,
        reviewerId: session.user.id,
        reviewedAt: now,
      },
    });

    await prisma.notification.create({
      data: {
        userId: postponeRequest.requesterId,
        type: "POSTPONE_REJECTED",
        title: "Postpone request rejected",
        message: `Your postpone request for "${task.title}" was rejected.${assignerNote ? ` Note: ${assignerNote.trim()}` : ""}`,
        taskId: task.id,
      },
    });
  }

  return NextResponse.json({ success: true, action });
}
