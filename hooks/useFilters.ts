"use client";

import { create } from "zustand";
import { format, subYears } from "date-fns";

interface FilterState {
  startDate: string;
  endDate: string;
  source: string;
  listingId: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  setSource: (source: string) => void;
  setListingId: (id: string) => void;
  clearFilters: () => void;
  getQueryParams: () => Record<string, string>;
}

const defaultStartDate = format(subYears(new Date(), 1), "yyyy-MM-dd");
const defaultEndDate = format(new Date(), "yyyy-MM-dd");

export const useFilterStore = create<FilterState>((set, get) => ({
  startDate: defaultStartDate,
  endDate: defaultEndDate,
  source: "",
  listingId: "",

  setStartDate: (date) => set({ startDate: date }),
  setEndDate: (date) => set({ endDate: date }),
  setSource: (source) => set({ source }),
  setListingId: (id) => set({ listingId: id }),

  clearFilters: () =>
    set({
      startDate: defaultStartDate,
      endDate: defaultEndDate,
      source: "",
      listingId: "",
    }),

  getQueryParams: () => {
    const { startDate, endDate, source, listingId } = get();
    const params: Record<string, string> = {
      start_date: startDate,
      end_date: endDate,
    };
    if (source) params.source = source;
    if (listingId) params.listing_id = listingId;
    return params;
  },
}));
