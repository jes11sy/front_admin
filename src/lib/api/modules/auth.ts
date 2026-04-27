import { apiClient } from '@/lib/api/client'

export const authApi = {
  login: apiClient.login.bind(apiClient),
  logout: apiClient.logout.bind(apiClient),
  isAuthenticated: apiClient.isAuthenticated.bind(apiClient),
  getProfile: apiClient.getProfile.bind(apiClient),
  refreshAuthToken: apiClient.refreshAuthToken.bind(apiClient),
  restoreSessionFromIndexedDB: apiClient.restoreSessionFromIndexedDB.bind(apiClient),
}
