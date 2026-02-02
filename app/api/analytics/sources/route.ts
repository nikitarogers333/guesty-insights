import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const sources = await prisma.reservation.findMany({
    select: { source: true },
    distinct: ["source"],
  });

  return NextResponse.json({ sources: sources.map((s) => s.source).filter(Boolean) });
}
