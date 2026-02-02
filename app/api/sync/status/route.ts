import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const lastSync = await prisma.syncLog.findFirst({
    orderBy: { startedAt: "desc" },
  });

  if (!lastSync) {
    return NextResponse.json({
      status: "never_run",
      message: "No sync has been run yet",
    });
  }

  return NextResponse.json({
    status: lastSync.status,
    entity_type: lastSync.entityType,
    records_synced: lastSync.recordsSynced,
    started_at: lastSync.startedAt?.toISOString(),
    completed_at: lastSync.completedAt?.toISOString(),
    error_message: lastSync.errorMessage,
  });
}
