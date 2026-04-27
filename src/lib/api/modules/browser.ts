import { apiClient } from '@/lib/api/client'

export const browserApi = {
  startBrowserSession: apiClient.startBrowserSession.bind(apiClient),
  getBrowserSessionStatus: apiClient.getBrowserSessionStatus.bind(apiClient),
  getBrowserSessionCookies: apiClient.getBrowserSessionCookies.bind(apiClient),
  closeBrowserSession: apiClient.closeBrowserSession.bind(apiClient),
}
