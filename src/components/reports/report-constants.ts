export type ReportType = 'cash' | 'orders' | 'campaigns'

export const reportTabs: Array<{ id: ReportType; label: string }> = [
  { id: 'cash', label: 'По кассе' },
  { id: 'orders', label: 'По заказам' },
  { id: 'campaigns', label: 'По РК' },
]

export const PAYMENT_PURPOSES = {
  expense: [
    { value: 'Авито', label: 'Авито' },
    { value: 'Офис', label: 'Офис' },
    { value: 'Промоутеры', label: 'Промоутеры' },
    { value: 'Листовки', label: 'Листовки' },
    { value: 'Инкасс', label: 'Инкасс' },
    { value: 'Зарплата директора', label: 'Зарплата директора' },
    { value: 'Иное', label: 'Иное' },
  ],
  income: [
    { value: 'Заказ', label: 'Заказ' },
    { value: 'Депозит', label: 'Депозит' },
    { value: 'Штраф', label: 'Штраф' },
    { value: 'Иное', label: 'Иное' },
  ],
}

export const ALL_PURPOSES = [
  ...PAYMENT_PURPOSES.expense,
  ...PAYMENT_PURPOSES.income.filter((p) => !PAYMENT_PURPOSES.expense.find((e) => e.value === p.value)),
]

export interface ReportData {
  type: ReportType
  generatedAt: string
  period: { from: string; to: string }
  cityIds: number[]
  data: any
  purposes?: string[]
}
