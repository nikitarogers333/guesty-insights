import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildReservationConditions, whereClause } from "@/lib/analytics/filters";
import { parseFilters } from "@/lib/analytics/parse";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const params = parseFilters(searchParams);
  const interval = searchParams.get("interval") === "week" ? "week" : "month";
  const reservationConditions = buildReservationConditions(params);
  const periodExpr = Prisma.raw(`date_trunc('${interval}', r.booked_at)`);

  const rows = await prisma.$queryRaw<Array<{ period: Date; bookings: bigint; revenue: bigint }>>(Prisma.sql`
    SELECT
      ${periodExpr} AS period,
      COUNT(*) AS bookings,
      COALESCE(SUM(r.total_price), 0) AS revenue
    FROM reservations r
    ${whereClause([...reservationConditions, Prisma.sql`r.status <> 'cancelled'`])}
    GROUP BY ${periodExpr}
    ORDER BY ${periodExpr}
  `);

  const data = rows.map((row) => ({
    period: interval === "month"
      ? row.period.toISOString().slice(0, 7)
      : row.period.toISOString().slice(0, 10),
    bookings: Number(row.bookings || 0),
    revenue: Number(row.revenue || 0),
  }));

  return NextResponse.json({ interval, data });
}
