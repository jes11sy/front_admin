import { apiClient } from '@/lib/api/client'

export const ordersApi = {
  getOrders: apiClient.getOrders.bind(apiClient),
  getOrder: apiClient.getOrder.bind(apiClient),
  getFilterOptions: apiClient.getFilterOptions.bind(apiClient),
  getOrderHistory: apiClient.getOrderHistory.bind(apiClient),
  getOrdersByPhone: apiClient.getOrdersByPhone.bind(apiClient),
}
