import { apiClient } from '@/lib/api/client'

export const reportsApi = {
  getCities: apiClient.getCities.bind(apiClient),
  getCashByPurpose: apiClient.getCashByPurpose.bind(apiClient),
  getCitiesReport: apiClient.getCitiesReport.bind(apiClient),
  getCampaignsReport: apiClient.getCampaignsReport.bind(apiClient),
}
