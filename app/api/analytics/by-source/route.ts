import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildReservationConditions, whereClause } from "@/lib/analytics/filters";
import { parseFilters } from "@/lib/analytics/parse";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = parseFilters(new URL(request.url).searchParams);
  const reservationConditions = buildReservationConditions(params);

  const rows = await prisma.$queryRaw<
    Array<{ source: string; bookings: bigint; revenue: bigint; avg_lead_time: number; avg_nights: number }>
  >(Prisma.sql`
    SELECT
      r.source,
      COUNT(*) AS bookings,
      COALESCE(SUM(r.total_price), 0) AS revenue,
      COALESCE(AVG(r.lead_time_days), 0) AS avg_lead_time,
      COALESCE(AVG(r.nights), 0) AS avg_nights
    FROM reservations r
    ${whereClause([...reservationConditions, Prisma.sql`r.status <> 'cancelled'`])}
    GROUP BY r.source
  `);

  const sources = rows.map((row) => {
    const bookings = Number(row.bookings || 0);
    const revenue = Number(row.revenue || 0);
    const avgNights = Number(row.avg_nights || 0);
    const adr = bookings > 0 && avgNights > 0 ? revenue / (bookings * avgNights) / 100 : 0;
    return {
      source: row.source,
      bookings,
      revenue,
      avg_lead_time: Number(row.avg_lead_time || 0),
      avg_nights: avgNights,
      adr: Math.round(adr),
    };
  });

  return NextResponse.json({ sources });
}
