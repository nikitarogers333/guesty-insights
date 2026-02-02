import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildReservationConditions, whereClause } from "@/lib/analytics/filters";
import { parseFilters } from "@/lib/analytics/parse";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = parseFilters(new URL(request.url).searchParams);
  const reservationConditions = buildReservationConditions(params);

  const rows = await prisma.$queryRaw<Array<{ lead_time_days: number }>>(Prisma.sql`
    SELECT r.lead_time_days
    FROM reservations r
    ${whereClause([...reservationConditions, Prisma.sql`r.status <> 'cancelled'`])}
  `);

  const buckets = [
    { range: "0-7", min: 0, max: 7, count: 0 },
    { range: "8-14", min: 8, max: 14, count: 0 },
    { range: "15-30", min: 15, max: 30, count: 0 },
    { range: "31-60", min: 31, max: 60, count: 0 },
    { range: "61-90", min: 61, max: 90, count: 0 },
    { range: "90+", min: 91, max: Number.MAX_SAFE_INTEGER, count: 0 },
  ];

  for (const row of rows) {
    const lt = Number(row.lead_time_days || 0);
    const bucket = buckets.find((b) => lt >= b.min && lt <= b.max);
    if (bucket) bucket.count += 1;
  }

  return NextResponse.json({
    buckets: buckets.map((b) => ({ range: b.range, count: b.count })),
  });
}
