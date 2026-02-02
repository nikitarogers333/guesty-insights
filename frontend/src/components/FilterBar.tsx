import { useFilterStore } from '../hooks/useFilters'

export default function FilterBar() {
  const { startDate, endDate, source, setStartDate, setEndDate, setSource, clearFilters } = useFilterStore()

  return (
    <div className="flex flex-wrap items-center gap-3 flex-1">
      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-500">From:</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-500">To:</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <select
        value={source}
        onChange={(e) => setSource(e.target.value)}
        className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="">All Sources</option>
        <option value="airbnb">Airbnb</option>
        <option value="vrbo">VRBO</option>
        <option value="booking">Booking.com</option>
        <option value="expedia">Expedia</option>
        <option value="direct">Direct</option>
      </select>

      <button
        onClick={clearFilters}
        className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
      >
        Clear
      </button>
    </div>
  )
}
