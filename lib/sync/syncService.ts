import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getListings, getReservations, getGuests, getConversations } from "@/lib/guesty/client";
import { normalizeSource } from "@/lib/guesty/normalizer";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function hashEmail(email?: string | null) {
  if (!email) return null;
  return crypto.createHash("sha256").update(email.toLowerCase()).digest("hex");
}

function diffDays(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / MS_PER_DAY);
}

export async function syncListings(): Promise<number> {
  let count = 0;
  let skip = 0;
  const limit = 100;

  while (true) {
    const result = await getListings(skip, limit);
    const listings = result.results || [];
    if (listings.length === 0) break;

    for (const item of listings) {
      await prisma.listing.upsert({
        where: { guestyId: item._id },
        create: {
          guestyId: item._id,
          name: item.title || "",
          bedrooms: item.bedrooms || 0,
          bathrooms: item.bathrooms || 0,
          propertyType: item.propertyType || null,
          active: item.active ?? true,
          address: item.address?.full || null,
        },
        update: {
          name: item.title || "",
          bedrooms: item.bedrooms || 0,
          bathrooms: item.bathrooms || 0,
          propertyType: item.propertyType || null,
          active: item.active ?? true,
          address: item.address?.full || null,
        },
      });
      count += 1;
    }

    if (listings.length < limit) break;
    skip += limit;
  }

  return count;
}

export async function syncGuests(): Promise<number> {
  let count = 0;
  let skip = 0;
  const limit = 100;

  while (true) {
    const result = await getGuests(skip, limit);
    const guests = result.results || [];
    if (guests.length === 0) break;

    for (const item of guests) {
      await prisma.guest.upsert({
        where: { guestyId: item._id },
        create: {
          guestyId: item._id,
          emailHash: hashEmail(item.email),
        },
        update: {
          emailHash: hashEmail(item.email),
        },
      });
      count += 1;
    }

    if (guests.length < limit) break;
    skip += limit;
  }

  return count;
}

export async function syncReservations(lookbackYears: number): Promise<number> {
  let count = 0;
  let skip = 0;
  const limit = 100;
  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - lookbackYears * 365);

  const filters = [
    {
      field: "checkIn",
      operator: "$gte",
      value: lookbackDate.toISOString(),
    },
  ];

  const listings = await prisma.listing.findMany({ select: { id: true, guestyId: true } });
  const guests = await prisma.guest.findMany({ select: { id: true, guestyId: true } });
  const listingMap = new Map(listings.map((l) => [l.guestyId, l.id]));
  const guestMap = new Map(guests.map((g) => [g.guestyId, g.id]));

  while (true) {
    const result = await getReservations(skip, limit, filters);
    const reservations = result.results || [];
    if (reservations.length === 0) break;

    for (const item of reservations) {
      const checkIn = new Date(item.checkIn);
      const checkOut = new Date(item.checkOut);
      const createdAtRaw =
        item.createdAt || item.bookedAt || item.confirmedAt || item.created_at || item.updatedAt;
      const bookedAt = createdAtRaw ? new Date(createdAtRaw) : new Date(checkIn);
      const nights = diffDays(checkOut, checkIn);
      const leadTimeDays = diffDays(checkIn, bookedAt);
      const totalPrice = Math.round(parseFloat(item.money?.totalPrice || 0) * 100);
      const source = normalizeSource(item.source);
      const status = item.status || "confirmed";
      const listingId = listingMap.get(item.listingId);
      const guestId = guestMap.get(item.guestId);
      const cancelledAt = item.canceledAt ? new Date(item.canceledAt) : null;

      await prisma.reservation.upsert({
        where: { guestyId: item._id },
        create: {
          guestyId: item._id,
          listingId: listingId || null,
          guestId: guestId || null,
          source,
          status,
          checkIn,
          checkOut,
          bookedAt,
          totalPrice: BigInt(totalPrice),
          nights,
          leadTimeDays,
          cancelledAt,
        },
        update: {
          listingId: listingId || null,
          guestId: guestId || null,
          source,
          status,
          checkIn,
          checkOut,
          bookedAt,
          totalPrice: BigInt(totalPrice),
          nights,
          leadTimeDays,
          cancelledAt,
        },
      });
      count += 1;
    }

    if (reservations.length < limit) break;
    skip += limit;
  }

  return count;
}

export async function syncConversations(): Promise<number> {
  let count = 0;
  let skip = 0;
  const limit = 100;

  const listings = await prisma.listing.findMany({ select: { id: true, guestyId: true } });
  const guests = await prisma.guest.findMany({ select: { id: true, guestyId: true } });
  const reservations = await prisma.reservation.findMany({ select: { id: true, guestyId: true } });
  const listingMap = new Map(listings.map((l) => [l.guestyId, l.id]));
  const guestMap = new Map(guests.map((g) => [g.guestyId, g.id]));
  const reservationMap = new Map(reservations.map((r) => [r.guestyId, r.id]));

  while (true) {
    const result = await getConversations(skip, limit);
    const conversations = result.results || [];
    if (conversations.length === 0) break;

    for (const item of conversations) {
      const listingId = listingMap.get(item.listingId);
      const guestId = guestMap.get(item.guestId);
      const reservationId = reservationMap.get(item.reservationId);
      const source = normalizeSource(item.source);
      const convertedToBooking = Boolean(reservationId);
      const firstMessageAt = item.createdAt ? new Date(item.createdAt) : null;
      const messageCount = item.messageCount || 0;

      await prisma.conversation.upsert({
        where: { guestyId: item._id },
        create: {
          guestyId: item._id,
          listingId: listingId || null,
          guestId: guestId || null,
          reservationId: reservationId || null,
          source,
          convertedToBooking,
          firstMessageAt,
          messageCount,
        },
        update: {
          listingId: listingId || null,
          guestId: guestId || null,
          reservationId: reservationId || null,
          source,
          convertedToBooking,
          firstMessageAt,
          messageCount,
        },
      });
      count += 1;
    }

    if (conversations.length < limit) break;
    skip += limit;
  }

  return count;
}

export async function runFullSync() {
  const syncLog = await prisma.syncLog.create({
    data: {
      entityType: "full",
      startedAt: new Date(),
      status: "running",
    },
  });

  try {
    const listings = await syncListings();
    const guests = await syncGuests();
    const reservations = await syncReservations(parseInt(process.env.SYNC_LOOKBACK_YEARS || "3", 10));
    const conversations = await syncConversations();

    const total = listings + guests + reservations + conversations;

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        recordsSynced: total,
        completedAt: new Date(),
        status: "success",
      },
    });

    return total;
  } catch (error: any) {
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "failed",
        errorMessage: String(error?.message || error),
        completedAt: new Date(),
      },
    });
    throw error;
  }
}
