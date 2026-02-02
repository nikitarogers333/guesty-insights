import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildReservationConditions, whereClause } from "@/lib/analytics/filters";
import { parseFilters } from "@/lib/analytics/parse";

export async function GET(request: Request) {
  const params = parseFilters(new URL(request.url).searchParams);
  const reservationConditions = buildReservationConditions(params);

  const totalRows = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
    SELECT COUNT(*) AS total
    FROM reservations r
    ${whereClause(reservationConditions)}
  `);

  const cancelledRows = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
    SELECT COUNT(*) AS total
    FROM reservations r
    ${whereClause([...reservationConditions, Prisma.sql`r.status = 'cancelled'`])}
  `);

  const bySourceRows = await prisma.$queryRaw<Array<{ source: string; total: bigint; cancelled: bigint }>>(Prisma.sql`
    SELECT
      r.source,
      COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN r.status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled
    FROM reservations r
    ${whereClause(reservationConditions)}
    GROUP BY r.source
  `);

  const avgDaysRows = await prisma.$queryRaw<Array<{ avg_days: number }>>(Prisma.sql`
    SELECT COALESCE(AVG(EXTRACT(DAY FROM r.check_in - r.cancelled_at)), 0) AS avg_days
    FROM reservations r
    ${whereClause([...reservationConditions, Prisma.sql`r.status = 'cancelled'`, Prisma.sql`r.cancelled_at IS NOT NULL`])}
  `);

  const totalBookings = Number(totalRows[0]?.total || 0);
  const totalCancellations = Number(cancelledRows[0]?.total || 0);
  const cancellationRate = totalBookings > 0 ? totalCancellations / totalBookings : 0;

  return NextResponse.json({
    total_bookings: totalBookings,
    total_cancellations: totalCancellations,
    cancellation_rate: Number(cancellationRate.toFixed(3)),
    by_source: bySourceRows.map((row) => ({
      source: row.source,
      cancellations: Number(row.cancelled || 0),
      rate: Number(
        (Number(row.total) > 0 ? Number(row.cancelled) / Number(row.total) : 0).toFixed(3)
      ),
    })),
    avg_days_before_checkin: Math.round(Number(avgDaysRows[0]?.avg_days || 0)),
  });
}
