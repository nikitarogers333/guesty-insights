import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "healthy", database: "connected" });
  } catch (error: any) {
    return NextResponse.json(
      { status: "unhealthy", database: "disconnected", error: String(error?.message || error) },
      { status: 500 }
    );
  }
}
