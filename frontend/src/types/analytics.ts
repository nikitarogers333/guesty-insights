export interface SummaryData {
  total_bookings: number
  total_revenue: number
  avg_lead_time_days: number
  avg_length_of_stay: number
  conversion_rate: number
  cancellation_rate: number
  top_source: string
}

export interface SourceMetrics {
  source: string
  bookings: number
  revenue: number
  avg_lead_time: number
  avg_nights: number
  adr: number
}

export interface BySourceData {
  sources: SourceMetrics[]
}

export interface TimeSeriesPoint {
  period: string
  bookings: number
  revenue: number
}

export interface TimeSeriesData {
  interval: string
  data: TimeSeriesPoint[]
}

export interface LeadTimeBucket {
  range: string
  count: number
}

export interface LeadTimeData {
  buckets: LeadTimeBucket[]
}

export interface FunnelStage {
  stage: string
  count: number
}

export interface ConversionFunnelData {
  stages: FunnelStage[]
  conversion_rate: number
}

export interface DayOfWeekData {
  days: Array<{ day: string; bookings: number }>
}

export interface CancellationSourceData {
  source: string
  cancellations: number
  rate: number
}

export interface CancellationsData {
  total_bookings: number
  total_cancellations: number
  cancellation_rate: number
  by_source: CancellationSourceData[]
  avg_days_before_checkin: number
}

export interface Listing {
  id: string
  guesty_id: string
  name: string
}

export interface ListingMonthSourceData {
  bookings: number
  revenue: number
}

export interface ListingMonth {
  month: string
  total_revenue: number
  total_bookings: number
  by_source: Record<string, ListingMonthSourceData>
}

export interface ListingPerformanceItem {
  id: string
  name: string
  address: string | null
  bedrooms: number
  bathrooms: number
  property_type: string | null
  total_revenue: number
  total_bookings: number
  total_nights: number
  months: ListingMonth[]
}

export interface ListingPerformanceData {
  listings: ListingPerformanceItem[]
  all_months: string[]
  all_sources: string[]
}

export interface ListingsData {
  listings: Listing[]
}
