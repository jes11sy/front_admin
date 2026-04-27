import { apiClient } from '@/lib/api/client'

export const notificationsApi = {
  getNotifications: apiClient.getNotifications.bind(apiClient),
  markNotificationAsRead: apiClient.markNotificationAsRead.bind(apiClient),
  markAllNotificationsAsRead: apiClient.markAllNotificationsAsRead.bind(apiClient),
}
