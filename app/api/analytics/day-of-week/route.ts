import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildReservationConditions, whereClause } from "@/lib/analytics/filters";
import { parseFilters } from "@/lib/analytics/parse";

export async function GET(request: Request) {
  const params = parseFilters(new URL(request.url).searchParams);
  const reservationConditions = buildReservationConditions(params);

  const rows = await prisma.$queryRaw<Array<{ day_num: number; bookings: bigint }>>(Prisma.sql`
    SELECT
      EXTRACT(DOW FROM r.booked_at) AS day_num,
      COUNT(*) AS bookings
    FROM reservations r
    ${whereClause([...reservationConditions, Prisma.sql`r.status <> 'cancelled'`])}
    GROUP BY EXTRACT(DOW FROM r.booked_at)
  `);

  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const counts = new Array(7).fill(0);
  for (const row of rows) {
    const idx = Number(row.day_num);
    counts[idx] = Number(row.bookings || 0);
  }

  return NextResponse.json({
    days: dayNames.map((day, i) => ({ day, bookings: counts[i] })),
  });
}
