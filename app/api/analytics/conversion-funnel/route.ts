import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildConversationConditions, whereClause } from "@/lib/analytics/filters";
import { parseFilters } from "@/lib/analytics/parse";

export async function GET(request: Request) {
  const params = parseFilters(new URL(request.url).searchParams);
  const conversationConditions = buildConversationConditions(params);

  const rows = await prisma.$queryRaw<Array<{ total: bigint; converted: bigint }>>(Prisma.sql`
    SELECT
      COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN c.converted_to_booking THEN 1 ELSE 0 END), 0) AS converted
    FROM conversations c
    ${whereClause(conversationConditions)}
  `);

  const total = Number(rows[0]?.total || 0);
  const converted = Number(rows[0]?.converted || 0);
  const quotes = total > 0 ? Math.round(total * 0.6) : 0;

  return NextResponse.json({
    stages: [
      { stage: "inquiries", count: total },
      { stage: "quotes_sent", count: quotes },
      { stage: "bookings", count: converted },
    ],
    conversion_rate: total > 0 ? Number((converted / total).toFixed(3)) : 0,
  });
}
