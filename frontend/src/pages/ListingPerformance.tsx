import { useState, useEffect, useMemo } from 'react'
import { analyticsApi } from '../api/client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { Search, ChevronDown, ChevronUp, Building2, MapPin, BedDouble, Bath, Home, DollarSign, Calendar, TrendingUp } from 'lucide-react'

const CHANNEL_COLORS: Record<string, string> = {
  airbnb: '#FF5A5F',
  vrbo: '#3B5998',
  booking_com: '#003580',
  direct: '#10B981',
  unknown: '#9CA3AF',
}

const CHANNEL_LABELS: Record<string, string> = {
  airbnb: 'Airbnb',
  vrbo: 'VRBO',
  booking_com: 'Booking.com',
  direct: 'Direct',
  unknown: 'Unknown',
}

function formatCurrency(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(m) - 1]} ${y}`
}

type SortKey = 'revenue' | 'bookings' | 'bedrooms' | 'name'

interface ListingData {
  id: string
  name: string
  nickname: string
  bedrooms: number
  bathrooms: number
  accommodates: number
  property_type: string
  active: boolean
  total_revenue: number
  total_bookings: number
  total_nights: number
  channel_breakdown: { source: string; revenue: number; bookings: number }[]
  monthly: {
    month: string
    channels: Record<string, { revenue: number; bookings: number; nights: number }>
    total_revenue: number
    total_bookings: number
    total_nights: number
  }[]
}

interface APIResponse {
  listings: ListingData[]
  total_listings: number
  listings_with_bookings: number
}

export default function ListingPerformance() {
  const [data, setData] = useState<APIResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('revenue')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    analyticsApi.getListingPerformance()
      .then(setData)
      .catch((e) => setError(e.message || 'Failed to load listing data'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!data) return []
    let list = data.listings
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(l =>
        l.name.toLowerCase().includes(q) || (l.nickname || '').toLowerCase().includes(q)
      )
    }
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'revenue': return b.total_revenue - a.total_revenue
        case 'bookings': return b.total_bookings - a.total_bookings
        case 'bedrooms': return b.bedrooms - a.bedrooms
        case 'name': return a.name.localeCompare(b.name)
        default: return 0
      }
    })
    return list
  }, [data, search, sortBy])

  // Collect all unique channels across all listings for chart consistency
  const allChannels = useMemo(() => {
    if (!data) return []
    const set = new Set<string>()
    data.listings.forEach(l => l.channel_breakdown.forEach(c => set.add(c.source)))
    return Array.from(set).sort()
  }, [data])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-3 text-slate-500">Loading listings…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700 font-medium">Error loading listing data</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
        <p className="text-slate-500 text-xs mt-3">Make sure the Listings API service is running and VITE_LISTINGS_API_URL is set.</p>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Listing Performance</h1>
        <p className="text-slate-500 mt-1">
          {data.total_listings} listings · {data.listings_with_bookings} with bookings
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or nickname…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          {(['revenue', 'bookings', 'bedrooms', 'name'] as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                sortBy === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Listings */}
      <div className="space-y-3">
        {filtered.map((listing) => {
          const isExpanded = expandedId === listing.id
          return (
            <div key={listing.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Summary Row */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : listing.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <h3 className="font-semibold text-slate-800 truncate">{listing.name}</h3>
                    {!listing.active && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">Inactive</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate max-w-[300px]">{listing.nickname || listing.name}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <BedDouble className="w-3 h-3" />{listing.bedrooms} bd
                    </span>
                    <span className="flex items-center gap-1">
                      <Bath className="w-3 h-3" />{listing.bathrooms} ba
                    </span>
                    <span className="flex items-center gap-1">
                      <Home className="w-3 h-3" />{listing.property_type}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-6 ml-4">
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-800">{formatCurrency(listing.total_revenue)}</div>
                    <div className="text-xs text-slate-500">{listing.total_bookings} bookings · {listing.total_nights} nights</div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </button>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="border-t border-slate-100 p-4 space-y-6 bg-slate-50/50">
                  {/* Channel Breakdown Cards */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" /> Revenue by Channel
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      {listing.channel_breakdown.map((ch) => (
                        <div
                          key={ch.source}
                          className="bg-white rounded-lg border border-slate-200 p-3"
                          style={{ borderLeftColor: CHANNEL_COLORS[ch.source] || '#9CA3AF', borderLeftWidth: 4 }}
                        >
                          <div className="text-xs font-medium text-slate-500">{CHANNEL_LABELS[ch.source] || ch.source}</div>
                          <div className="text-lg font-bold text-slate-800 mt-1">{formatCurrency(ch.revenue)}</div>
                          <div className="text-xs text-slate-400">{ch.bookings} bookings</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Monthly Stacked Bar Chart */}
                  {listing.monthly.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Monthly Revenue by Channel
                      </h4>
                      <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={listing.monthly.map(m => {
                            const row: Record<string, any> = { month: formatMonthLabel(m.month) }
                            allChannels.forEach(ch => {
                              row[ch] = m.channels[ch]?.revenue ? m.channels[ch].revenue / 100 : 0
                            })
                            return row
                          })}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                            <Tooltip
                              formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, CHANNEL_LABELS[name] || name]}
                              labelStyle={{ fontWeight: 600 }}
                            />
                            <Legend formatter={(value) => CHANNEL_LABELS[value] || value} />
                            {allChannels.map((ch) => (
                              <Bar key={ch} dataKey={ch} stackId="revenue" fill={CHANNEL_COLORS[ch] || '#9CA3AF'} />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Monthly Detail Table */}
                  {listing.monthly.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" /> Monthly Breakdown
                      </h4>
                      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Month</th>
                              {allChannels.map(ch => (
                                <th key={ch} className="text-right px-4 py-2.5 font-semibold" style={{ color: CHANNEL_COLORS[ch] || '#6B7280' }}>
                                  {CHANNEL_LABELS[ch] || ch}
                                </th>
                              ))}
                              <th className="text-right px-4 py-2.5 font-semibold text-slate-800">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {listing.monthly.map((m) => (
                              <tr key={m.month} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-4 py-2 font-medium text-slate-700">{formatMonthLabel(m.month)}</td>
                                {allChannels.map(ch => (
                                  <td key={ch} className="text-right px-4 py-2 text-slate-600">
                                    {m.channels[ch] ? formatCurrency(m.channels[ch].revenue) : '—'}
                                  </td>
                                ))}
                                <td className="text-right px-4 py-2 font-bold text-slate-800">{formatCurrency(m.total_revenue)}</td>
                              </tr>
                            ))}
                            {/* Totals row */}
                            <tr className="bg-slate-50 font-bold">
                              <td className="px-4 py-2.5 text-slate-700">Total</td>
                              {allChannels.map(ch => {
                                const total = listing.monthly.reduce((sum, m) => sum + (m.channels[ch]?.revenue || 0), 0)
                                return (
                                  <td key={ch} className="text-right px-4 py-2.5" style={{ color: CHANNEL_COLORS[ch] || '#6B7280' }}>
                                    {total > 0 ? formatCurrency(total) : '—'}
                                  </td>
                                )
                              })}
                              <td className="text-right px-4 py-2.5 text-slate-800">{formatCurrency(listing.total_revenue)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {listing.total_bookings === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No confirmed bookings for this listing</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No listings match your search</p>
        </div>
      )}
    </div>
  )
}
