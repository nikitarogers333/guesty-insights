import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://backend-production-636b.up.railway.app'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Analytics API functions — endpoint names match the deployed backend
export const analyticsApi = {
  getSummary: async (params: Record<string, string>) => {
    const { data } = await apiClient.get('/api/analytics/overview', { params })
    return data
  },

  getBySource: async (params: Record<string, string>) => {
    const { data } = await apiClient.get('/api/analytics/ota-comparison', { params })
    return data
  },

  getTimeSeries: async (params: Record<string, string> & { interval?: string }) => {
    const { data } = await apiClient.get('/api/analytics/revenue-over-time', { params })
    return data
  },

  getLeadTimeDistribution: async (params: Record<string, string>) => {
    const { data } = await apiClient.get('/api/analytics/lead-time-distribution', { params })
    return data
  },

  getConversionFunnel: async (params: Record<string, string>) => {
    const { data } = await apiClient.get('/api/analytics/conversion', { params })
    return data
  },

  getDayOfWeek: async (params: Record<string, string>) => {
    const { data } = await apiClient.get('/api/analytics/booking-patterns', { params })
    return data
  },

  getCancellations: async (params: Record<string, string>) => {
    const { data } = await apiClient.get('/api/analytics/cancellations', { params })
    return data
  },

  getListingPerformance: async (params?: Record<string, string>) => {
    // Direct fetch to listings-api — hardcoded to avoid env var issues
    const url = new URL('https://guesty-insights-production.up.railway.app/api/analytics/listing-performance')
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    }
    const resp = await fetch(url.toString())
    if (!resp.ok) throw new Error(`Listings API error: ${resp.status}`)
    return resp.json()
  },

  getListings: async () => {
    const { data } = await apiClient.get('/api/analytics/sources')
    return data
  },

  getSources: async () => {
    const { data } = await apiClient.get('/api/analytics/sources')
    return data
  },
}

// Sync API functions
export const syncApi = {
  triggerSync: async () => {
    const { data } = await apiClient.post('/api/sync/trigger')
    return data
  },

  getStatus: async () => {
    const { data } = await apiClient.get('/api/sync/status')
    return data
  },
}
