import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Analytics API functions
export const analyticsApi = {
  getSummary: async (params: Record<string, string>) => {
    const { data } = await apiClient.get('/api/analytics/summary', { params })
    return data
  },

  getBySource: async (params: Record<string, string>) => {
    const { data } = await apiClient.get('/api/analytics/by-source', { params })
    return data
  },

  getTimeSeries: async (params: Record<string, string> & { interval?: string }) => {
    const { data } = await apiClient.get('/api/analytics/time-series', { params })
    return data
  },

  getLeadTimeDistribution: async (params: Record<string, string>) => {
    const { data } = await apiClient.get('/api/analytics/lead-time-distribution', { params })
    return data
  },

  getConversionFunnel: async (params: Record<string, string>) => {
    const { data } = await apiClient.get('/api/analytics/conversion-funnel', { params })
    return data
  },

  getDayOfWeek: async (params: Record<string, string>) => {
    const { data } = await apiClient.get('/api/analytics/day-of-week', { params })
    return data
  },

  getCancellations: async (params: Record<string, string>) => {
    const { data } = await apiClient.get('/api/analytics/cancellations', { params })
    return data
  },

  getListingPerformance: async () => {
    const { data } = await apiClient.get('/api/analytics/listing-performance')
    return data
  },

  getListings: async () => {
    const { data } = await apiClient.get('/api/analytics/listings')
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
