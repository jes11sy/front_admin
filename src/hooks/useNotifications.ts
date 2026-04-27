import { useState, useEffect, useCallback } from 'react'
import { notificationsApi } from '@/lib/api/modules/notifications'
import type { AppNotification } from '@/lib/api/types'
import { logger } from '@/lib/logger'

export type Notification = AppNotification

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const result = await notificationsApi.getNotifications()
      if (result.success && result.data) {
        setNotifications(result.data.notifications || [])
        setUnreadCount(result.data.unreadCount || 0)
      }
    } catch (err) {
      logger.error('Failed to load notifications', { error: String(err) })
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await notificationsApi.markNotificationAsRead(notificationId)
      if (response.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (err) {
      logger.error('Failed to mark notification as read', { error: String(err) })
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await notificationsApi.markAllNotificationsAsRead()
      if (response.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        setUnreadCount(0)
      }
    } catch (err) {
      logger.error('Failed to mark all notifications as read', { error: String(err) })
    }
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    reload: loadNotifications,
  }
}
