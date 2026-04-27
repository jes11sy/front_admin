import { apiClient } from '@/lib/api/client'

export const employeesApi = {
  getEmployees: apiClient.getEmployees.bind(apiClient),
  getEmployee: apiClient.getEmployee.bind(apiClient),
  createEmployee: apiClient.createEmployee.bind(apiClient),
  updateEmployee: apiClient.updateEmployee.bind(apiClient),
  getOperators: apiClient.getOperators.bind(apiClient),
  getMasters: apiClient.getMasters.bind(apiClient),
}
