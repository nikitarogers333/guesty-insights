import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runFullSync } from "@/lib/sync/syncService";

export const dynamic = "force-dynamic";

export async function POST() {
  const running = await prisma.syncLog.findFirst({
    where: { status: "running" },
    orderBy: { startedAt: "desc" },
  });

  if (running) {
    return NextResponse.json({
      status: "already_running",
      message: "A sync is already in progress",
      sync_id: running.id,
    });
  }

  void runFullSync();

  return NextResponse.json({
    status: "started",
    message: "Sync started in background",
  });
}
