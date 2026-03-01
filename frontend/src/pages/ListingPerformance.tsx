import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { analyticsApi } from '../api/client'
import ChartCard from '../components/ChartCard'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import { Building2, ChevronDown, ChevronUp, Search, Bed, Bath, MapPin, DollarSign, CalendarDays } from 'lucide-react'
import { clsx } from 'clsx'
import type { ListingPerformanceData, ListingPerformanceItem } from '../types/analytics'

const SOURCE_COLORS: Record<string, string> = {
  airbnb: '#FF5A5F',
  vrbo: '#3B5998',
  'booking.com': '#003580',
  direct: '#10b981',
  homeaway: '#F5A623',
  tripadvisor: '#00AF87',
}

const getSourceColor = (source: string, idx: number) => {
  const fallback = ['#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']
  return SOURCE_COLORS[source.toLowerCase()] || fallback[idx % fallback.length]
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value / 100)

const formatMonth = (m: string) => {
  const [year, month] = m.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[parseInt(month) - 1]} ${year}`
}

type SortField = 'revenue' | 'bookings' | 'name' | 'bedrooms'

export default function ListingPerformance() {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortField>('revenue')
  const [sortAsc, setSortAsc] = useState(false)

  const { data, isLoading } = useQuery<ListingPerformanceData>({
    queryKey: ['listingPerformance'],
    queryFn: () => analyticsApi.getListingPerformance(),
  })

  const filteredListings = useMemo(() => {
    if (!data) return []
    let listings = data.listings.filter(
      (l) =>
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.address && l.address.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    listings.sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'revenue': cmp = a.total_revenue - b.total_revenue; break
        case 'bookings': cmp = a.total_bookings - b.total_bookings; break
        case 'name': cmp = a.name.localeCompare(b.name); break
        case 'bedrooms': cmp = a.bedrooms - b.bedrooms; break
      }
      return sortAsc ? cmp : -cmp
    })
    return listings
  }, [data, searchTerm, sortBy, sortAsc])

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortBy(field)
      setSortAsc(false)
    }
  }

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className={clsx(
        'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
        sortBy === field
          ? 'bg-primary-100 text-primary-700'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      )}
    >
      {label} {sortBy === field && (sortAsc ? '↑' : '↓')}
    </button>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!data || data.listings.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Listing Performance</h2>
        <p className="text-slate-500">
          Revenue breakdown by property, month, and booking channel •{' '}
          {data.listings.length} listings • {data.all_months.length} months of data
        </p>
      </div>

      {/* Search + Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <SortButton field="revenue" label="Revenue" />
          <SortButton field="bookings" label="Bookings" />
          <SortButton field="bedrooms" label="Bedrooms" />
          <SortButton field="name" label="Name" />
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-slate-500">
        Showing {filteredListings.length} of {data.listings.length} listings
      </p>

      {/* Listing Cards */}
      <div className="space-y-3">
        {filteredListings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            sources={data.all_sources}
            expanded={expandedId === listing.id}
            onToggle={() => setExpandedId(expandedId === listing.id ? null : listing.id)}
          />
        ))}
      </div>
    </div>
  )
}

function ListingCard({
  listing,
  sources,
  expanded,
  onToggle,
}: {
  listing: ListingPerformanceItem
  sources: string[]
  expanded: boolean
  onToggle: () => void
}) {
  // Build chart data for the expanded view
  const chartData = useMemo(() => {
    return listing.months.map((m) => {
      const row: Record<string, string | number> = { month: formatMonth(m.month) }
      for (const source of sources) {
        row[source] = (m.by_source[source]?.revenue || 0) / 100
      }
      return row
    })
  }, [listing.months, sources])

  // Source totals for this listing
  const sourceTotals = useMemo(() => {
    const totals: Record<string, { revenue: number; bookings: number }> = {}
    for (const source of sources) {
      totals[source] = { revenue: 0, bookings: 0 }
    }
    for (const m of listing.months) {
      for (const source of sources) {
        const s = m.by_source[source]
        if (s) {
          totals[source].revenue += s.revenue
          totals[source].bookings += s.bookings
        }
      }
    }
    return totals
  }, [listing.months, sources])

  const avgPerMonth = listing.months.length > 0
    ? listing.total_revenue / listing.months.length
    : 0

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex-shrink-0 w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
          <Building2 className="w-5 h-5 text-primary-600" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 truncate">{listing.name}</h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-0.5">
            {listing.address && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="w-3 h-3" />
                <span className="truncate max-w-[300px]">{listing.address}</span>
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Bed className="w-3 h-3" /> {listing.bedrooms} bd
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Bath className="w-3 h-3" /> {listing.bathrooms} ba
            </span>
            {listing.property_type && (
              <span className="text-xs text-slate-400">{listing.property_type}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-500">Total Revenue</p>
            <p className="text-sm font-bold text-slate-900">{formatCurrency(listing.total_revenue)}</p>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-xs text-slate-500">Bookings</p>
            <p className="text-sm font-semibold text-slate-700">{listing.total_bookings}</p>
          </div>
          <div className="text-right hidden lg:block">
            <p className="text-xs text-slate-500">Avg/Month</p>
            <p className="text-sm font-semibold text-slate-700">{formatCurrency(avgPerMonth)}</p>
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t px-5 py-5 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Total Revenue</p>
              <p className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(listing.total_revenue)}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Total Bookings</p>
              <p className="text-lg font-bold text-slate-900 mt-1">{listing.total_bookings}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">Total Nights</p>
              <p className="text-lg font-bold text-slate-900 mt-1">{listing.total_nights.toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">Active Months</p>
              <p className="text-lg font-bold text-slate-900 mt-1">{listing.months.length}</p>
            </div>
          </div>

          {/* Channel Breakdown */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Revenue by Channel</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {sources.map((source, idx) => {
                const t = sourceTotals[source]
                if (!t || t.revenue === 0) return null
                const pct = listing.total_revenue > 0 ? (t.revenue / listing.total_revenue) * 100 : 0
                return (
                  <div key={source} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getSourceColor(source, idx) }}
                      />
                      <span className="text-xs font-medium text-slate-700 uppercase truncate">{source}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(t.revenue)}</p>
                    <p className="text-xs text-slate-500">{t.bookings} bookings • {pct.toFixed(1)}%</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Monthly Stacked Bar Chart */}
          {chartData.length > 0 && (
            <ChartCard title="Monthly Revenue by Channel" subtitle="Stacked by booking source">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    interval={chartData.length > 12 ? Math.floor(chartData.length / 12) : 0}
                  />
                  <YAxis tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                  <Tooltip
                    formatter={(value: number, name: string) => [`$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, name.toUpperCase()]}
                  />
                  <Legend formatter={(value) => value.toUpperCase()} />
                  {sources.map((source, idx) => (
                    <Bar
                      key={source}
                      dataKey={source}
                      stackId="revenue"
                      fill={getSourceColor(source, idx)}
                      radius={idx === sources.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Monthly Data Table */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Monthly Breakdown</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 text-xs font-medium text-slate-500">Month</th>
                    {sources.map((s) => (
                      <th key={s} className="text-right py-2 px-2 text-xs font-medium text-slate-500 uppercase">{s}</th>
                    ))}
                    <th className="text-right py-2 px-2 text-xs font-bold text-slate-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {listing.months.map((m) => (
                    <tr key={m.month} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="py-2 px-2 font-medium text-slate-700">{formatMonth(m.month)}</td>
                      {sources.map((source) => {
                        const rev = m.by_source[source]?.revenue || 0
                        return (
                          <td key={source} className="text-right py-2 px-2 text-slate-600">
                            {rev > 0 ? formatCurrency(rev) : <span className="text-slate-300">—</span>}
                          </td>
                        )
                      })}
                      <td className="text-right py-2 px-2 font-bold text-slate-900">{formatCurrency(m.total_revenue)}</td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="border-t-2 bg-slate-50 font-bold">
                    <td className="py-2 px-2 text-slate-900">Total</td>
                    {sources.map((source, idx) => (
                      <td key={source} className="text-right py-2 px-2 text-slate-900">
                        {sourceTotals[source].revenue > 0
                          ? formatCurrency(sourceTotals[source].revenue)
                          : <span className="text-slate-300">—</span>}
                      </td>
                    ))}
                    <td className="text-right py-2 px-2 text-slate-900">{formatCurrency(listing.total_revenue)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
