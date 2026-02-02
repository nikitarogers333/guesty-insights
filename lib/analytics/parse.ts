export function parseFilters(searchParams: URLSearchParams) {
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");
  const source = searchParams.get("source");
  const listingId = searchParams.get("listing_id");

  return {
    startDate: startDate || null,
    endDate: endDate || null,
    source: source || null,
    listingId: listingId || null,
  };
}
