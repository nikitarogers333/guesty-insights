import { Prisma } from "@prisma/client";

export type FilterParams = {
  startDate?: string | null;
  endDate?: string | null;
  source?: string | null;
  listingId?: string | null;
};

export function buildReservationConditions(params: FilterParams) {
  const conditions: Prisma.Sql[] = [];
  if (params.startDate) {
    conditions.push(Prisma.sql`r.check_in >= ${params.startDate}`);
  }
  if (params.endDate) {
    conditions.push(Prisma.sql`r.check_in <= ${params.endDate}`);
  }
  if (params.source) {
    conditions.push(Prisma.sql`r.source = ${params.source}`);
  }
  if (params.listingId) {
    conditions.push(Prisma.sql`r.listing_id = ${params.listingId}`);
  }
  return conditions;
}

export function buildConversationConditions(params: FilterParams) {
  const conditions: Prisma.Sql[] = [];
  if (params.startDate) {
    conditions.push(Prisma.sql`c.created_at >= ${params.startDate}`);
  }
  if (params.endDate) {
    conditions.push(Prisma.sql`c.created_at <= ${params.endDate}`);
  }
  if (params.source) {
    conditions.push(Prisma.sql`c.source = ${params.source}`);
  }
  if (params.listingId) {
    conditions.push(Prisma.sql`c.listing_id = ${params.listingId}`);
  }
  return conditions;
}

export function whereClause(conditions: Prisma.Sql[]) {
  if (conditions.length === 0) return Prisma.sql``;
  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
}
