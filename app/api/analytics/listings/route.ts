import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const listings = await prisma.listing.findMany({
    where: { active: true },
    select: { id: true, guestyId: true, name: true },
  });

  return NextResponse.json({
    listings: listings.map((l) => ({ id: l.id, guesty_id: l.guestyId, name: l.name })),
  });
}
