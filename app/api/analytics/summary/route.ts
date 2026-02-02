import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { buildConversationConditions, buildReservationConditions, whereClause } from "@/lib/analytics/filters";
import { parseFilters } from "@/lib/analytics/parse";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = parseFilters(new URL(request.url).searchParams);
  const reservationConditions = buildReservationConditions(params);
  const conversationConditions = buildConversationConditions(params);

  const stats = await prisma.$queryRaw<
    Array<{
      total_bookings: bigint;
      total_revenue: bigint;
      avg_lead_time_days: number;
      avg_length_of_stay: number;
    }>
  >(Prisma.sql`
    SELECT
      COUNT(*) AS total_bookings,
      COALESCE(SUM(r.total_price), 0) AS total_revenue,
      COALESCE(AVG(r.lead_time_days), 0) AS avg_lead_time_days,
      COALESCE(AVG(r.nights), 0) AS avg_length_of_stay
    FROM reservations r
    ${whereClause([...reservationConditions, Prisma.sql`r.status <> 'cancelled'`])}
  `);

  const totalAll = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
    SELECT COUNT(*) AS total
    FROM reservations r
    ${whereClause(reservationConditions)}
  `);

  const totalCancelled = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
    SELECT COUNT(*) AS total
    FROM reservations r
    ${whereClause([...reservationConditions, Prisma.sql`r.status = 'cancelled'`])}
  `);

  const convTotals = await prisma.$queryRaw<Array<{ total: bigint; converted: bigint }>>(Prisma.sql`
    SELECT
      COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN c.converted_to_booking THEN 1 ELSE 0 END), 0) AS converted
    FROM conversations c
    ${whereClause(conversationConditions)}
  `);

  const topSource = await prisma.$queryRaw<Array<{ source: string }>>(Prisma.sql`
    SELECT r.source
    FROM reservations r
    ${whereClause([...reservationConditions, Prisma.sql`r.status <> 'cancelled'`])}
    GROUP BY r.source
    ORDER BY COUNT(*) DESC
    LIMIT 1
  `);

  const statsRow = stats[0];
  const totalAllCount = Number(totalAll[0]?.total || 0);
  const totalCancelledCount = Number(totalCancelled[0]?.total || 0);
  const convRow = convTotals[0];
  const convTotal = Number(convRow?.total || 0);
  const convConverted = Number(convRow?.converted || 0);

  return NextResponse.json({
    total_bookings: Number(statsRow?.total_bookings || 0),
    total_revenue: Number(statsRow?.total_revenue || 0),
    avg_lead_time_days: Number(statsRow?.avg_lead_time_days || 0),
    avg_length_of_stay: Number(statsRow?.avg_length_of_stay || 0),
    conversion_rate: convTotal > 0 ? Number((convConverted / convTotal).toFixed(3)) : 0,
    cancellation_rate: totalAllCount > 0 ? Number((totalCancelledCount / totalAllCount).toFixed(3)) : 0,
    top_source: topSource[0]?.source || null,
  });
}
