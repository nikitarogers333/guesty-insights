import { useQuery } from '@tanstack/react-query'
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts'
import { analyticsApi } from '../api/client'
import { useFilterStore } from '../hooks/useFilters'
import ChartCard from '../components/ChartCard'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import type { DayOfWeekData, LeadTimeData, CancellationsData } from '../types/analytics'

export default function Patterns() {
  const { getQueryParams } = useFilterStore()
  const params = getQueryParams()

  const { data: dayOfWeek, isLoading: dowLoading } = useQuery<DayOfWeekData>({
    queryKey: ['dayOfWeek', params],
    queryFn: () => analyticsApi.getDayOfWeek(params),
  })

  const { data: leadTime, isLoading: leadTimeLoading } = useQuery<LeadTimeData>({
    queryKey: ['leadTimeDistribution', params],
    queryFn: () => analyticsApi.getLeadTimeDistribution(params),
  })

  const { data: cancellations, isLoading: cancelLoading } = useQuery<CancellationsData>({
    queryKey: ['cancellations', params],
    queryFn: () => analyticsApi.getCancellations(params),
  })

  const isLoading = dowLoading || leadTimeLoading || cancelLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!dayOfWeek && !leadTime && !cancellations) {
    return <EmptyState />
  }

  const dayData = dayOfWeek?.days.map(d => ({
    day: d.day.charAt(0).toUpperCase() + d.day.slice(1, 3),
    fullDay: d.day.charAt(0).toUpperCase() + d.day.slice(1),
    bookings: d.bookings,
  })) || []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Booking Patterns</h2>
        <p className="text-slate-500">Understand when and how your guests book</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Day of Week Pattern */}
        <ChartCard title="Bookings by Day of Week" subtitle="When do guests make bookings?">
          {dayData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dayData}>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip 
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDay || label}
                />
                <Bar dataKey="bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No day of week data" />
          )}
        </ChartCard>

        {/* Day of Week Radar */}
        <ChartCard title="Weekly Pattern Radar" subtitle="Visual pattern distribution">
          {dayData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={dayData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="day" />
                <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
                <Radar
                  name="Bookings"
                  dataKey="bookings"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.5}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No pattern data" />
          )}
        </ChartCard>

        {/* Lead Time Distribution */}
        <ChartCard title="Lead Time Distribution" subtitle="How far in advance do guests book?">
          {leadTime?.buckets && leadTime.buckets.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={leadTime.buckets}>
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value} bookings`} />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No lead time data" />
          )}
        </ChartCard>

        {/* Cancellation Stats */}
        <ChartCard title="Cancellation Analysis" subtitle="Cancellation rates by source">
          {cancellations?.by_source && cancellations.by_source.length > 0 ? (
            <>
              <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {cancellations.total_cancellations}
                    </p>
                    <p className="text-xs text-slate-500">Total Cancellations</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">
                      {(cancellations.cancellation_rate * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500">Cancellation Rate</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {cancellations.avg_days_before_checkin} days
                    </p>
                    <p className="text-xs text-slate-500">Avg Before Check-in</p>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart 
                  data={cancellations.by_source.map(s => ({
                    source: s.source.toUpperCase(),
                    rate: s.rate * 100,
                    cancellations: s.cancellations,
                  }))} 
                  layout="vertical"
                >
                  <XAxis type="number" domain={[0, 'auto']} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="source" width={80} />
                  <Tooltip formatter={(value: number, name: string) => 
                    name === 'rate' ? `${value.toFixed(1)}%` : value
                  } />
                  <Bar dataKey="rate" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : (
            <EmptyState title="No cancellation data" />
          )}
        </ChartCard>
      </div>

      {/* Lead Time Insights */}
      {leadTime?.buckets && leadTime.buckets.length > 0 && (
        <ChartCard title="Lead Time Insights" subtitle="Key observations from booking patterns">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(() => {
              const totalBookings = leadTime.buckets.reduce((sum, b) => sum + b.count, 0)
              const lastMinute = leadTime.buckets
                .filter(b => b.range === '0-7' || b.range === '8-14')
                .reduce((sum, b) => sum + b.count, 0)
              const advance = leadTime.buckets
                .filter(b => b.range === '61-90' || b.range === '90+')
                .reduce((sum, b) => sum + b.count, 0)
              const maxBucket = leadTime.buckets.reduce((max, b) => b.count > max.count ? b : max, leadTime.buckets[0])
              
              return (
                <>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600 font-medium">Last Minute (&lt;14 days)</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {((lastMinute / totalBookings) * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-blue-600">{lastMinute} bookings</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">Advance (&gt;60 days)</p>
                    <p className="text-2xl font-bold text-green-900">
                      {((advance / totalBookings) * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-green-600">{advance} bookings</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-600 font-medium">Most Common</p>
                    <p className="text-2xl font-bold text-purple-900">{maxBucket.range} days</p>
                    <p className="text-xs text-purple-600">{maxBucket.count} bookings</p>
                  </div>
                </>
              )
            })()}
          </div>
        </ChartCard>
      )}
    </div>
  )
}
