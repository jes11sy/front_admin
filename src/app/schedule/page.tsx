'use client'

import { useState, useEffect, useMemo } from 'react'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, UserRound } from 'lucide-react'

interface Master {
  id: number
  name: string
  cityIds?: number[]
}

interface Schedule {
  id: number
  masterId: number
  date: string
  status: 'working' | 'day_off' | 'vacation'
  note: string | null
}

type DayStatus = 'working' | 'day_off' | 'vacation' | null

const STATUS_LABELS: Record<Exclude<DayStatus, null>, string> = {
  working: 'Работает',
  day_off: 'Выходной',
  vacation: 'Отпуск',
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

export default function SchedulePage() {
  const theme = useDesignStore((state) => state.theme)
  const isDark = theme === 'dark'

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [masters, setMasters] = useState<Master[]>([])
  const [selectedMaster, setSelectedMaster] = useState<number | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [cities, setCities] = useState<Array<{ id: number; name: string }>>([])
  const [cityFilter, setCityFilter] = useState('')

  useEffect(() => {
    apiClient
      .getMasters()
      .then((r) => {
        if (r.success) setMasters(Array.isArray(r.data) ? r.data : [])
      })
      .catch(() => {})

    apiClient
      .getCities()
      .then((c) => setCities(c))
      .catch(() => {})
  }, [])

  const filteredMasters = useMemo(() => {
    if (!cityFilter) return masters
    return masters.filter((m) => m.cityIds?.includes(Number(cityFilter)))
  }, [masters, cityFilter])

  const loadSchedule = async () => {
    if (!selectedMaster) return

    setIsLoading(true)
    try {
      const dateFrom = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const lastDay = getDaysInMonth(year, month)
      const dateTo = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      const res = await apiClient.getMasterSchedules({ masterId: selectedMaster, dateFrom, dateTo })
      if (res.success) setSchedules(Array.isArray(res.data) ? res.data : [])
    } catch {
      toast.error('Не удалось загрузить расписание')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSchedule()
  }, [selectedMaster, year, month])

  const getStatus = (day: number): DayStatus => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return schedules.find((s) => s.date.startsWith(dateStr))?.status || null
  }

  const setDayStatus = async (day: number, status: DayStatus) => {
    if (!selectedMaster || !status) return

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSaving(dateStr)

    try {
      await apiClient.upsertMasterSchedule({ masterId: selectedMaster, date: dateStr, status })
      setSchedules((prev) => {
        const filtered = prev.filter((s) => !s.date.startsWith(dateStr))
        return [...filtered, { id: Date.now(), masterId: selectedMaster, date: dateStr, status, note: null }]
      })
    } catch (e: any) {
      toast.error(e.message || 'Ошибка')
    } finally {
      setSaving(null)
    }
  }

  const clearDay = async (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const existing = schedules.find((s) => s.date.startsWith(dateStr))
    if (!existing) return

    setSaving(dateStr)
    try {
      await apiClient.deleteMasterSchedule(existing.id)
      setSchedules((prev) => prev.filter((s) => !s.date.startsWith(dateStr)))
    } catch (e: any) {
      toast.error(e.message || 'Ошибка')
    } finally {
      setSaving(null)
    }
  }

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11)
      setYear((y) => y - 1)
    } else {
      setMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0)
      setYear((y) => y + 1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  const resetToCurrentMonth = () => {
    setMonth(today.getMonth())
    setYear(today.getFullYear())
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)
  const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
  const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  const selectedMasterObj = masters.find((m) => m.id === selectedMaster)

  const pageClass = isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'
  const panelClass = isDark
    ? 'border border-white/10 bg-white/[0.03]'
    : 'border border-black/[0.08] bg-white'
  const mutedClass = isDark ? 'text-gray-400' : 'text-gray-500'
  const titleClass = isDark ? 'text-white' : 'text-[#111113]'
  const labelClass = isDark
    ? 'mb-2 flex items-center gap-2 text-sm font-medium text-gray-300'
    : 'mb-2 flex items-center gap-2 text-sm font-medium text-gray-700'
  const selectClass = isDark
    ? 'w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-gray-100 outline-none transition focus:border-white/20'
    : 'w-full rounded-2xl border border-[#cfd2d8] bg-white px-4 py-3 text-sm text-[#111113] shadow-[0_1px_2px_rgba(15,23,42,0.06)] outline-none transition focus:border-[#c4c9d1]'
  const ghostButtonClass = isDark
    ? 'flex h-10 w-10 items-center justify-center rounded-2xl text-white/92 transition hover:bg-white/[0.04] hover:text-white'
    : 'flex h-10 w-10 items-center justify-center rounded-2xl text-[#3a3a3c] transition hover:-translate-y-[1px] hover:bg-black/[0.035] hover:text-[#111113]'

  const statusMeta: Record<Exclude<DayStatus, null>, { dot: string; pill: string; button: string }> = {
    working: {
      dot: 'bg-emerald-500',
      pill: isDark ? 'bg-emerald-500/12 text-emerald-300' : 'bg-emerald-50 text-emerald-700',
      button: isDark ? 'bg-emerald-500/12 text-emerald-300 hover:bg-emerald-500/18' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    },
    day_off: {
      dot: isDark ? 'bg-gray-400' : 'bg-gray-500',
      pill: isDark ? 'bg-white/[0.06] text-gray-300' : 'bg-gray-100 text-gray-700',
      button: isDark ? 'bg-white/[0.06] text-gray-300 hover:bg-white/[0.1]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    },
    vacation: {
      dot: 'bg-sky-500',
      pill: isDark ? 'bg-sky-500/12 text-sky-300' : 'bg-sky-50 text-sky-700',
      button: isDark ? 'bg-sky-500/12 text-sky-300 hover:bg-sky-500/18' : 'bg-sky-50 text-sky-700 hover:bg-sky-100',
    },
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${pageClass}`}>
      <div className="px-4 py-6">
        <section className={`mb-4 rounded-[20px] p-5 ${panelClass}`}>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
            <div>
              <label className={labelClass}>
                <MapPin className="h-4 w-4" />
                Город
              </label>
              <select
                className={selectClass}
                value={cityFilter}
                onChange={(e) => {
                  setCityFilter(e.target.value)
                  setSelectedMaster(null)
                }}
              >
                <option value="">Все города</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                <UserRound className="h-4 w-4" />
                Мастер
              </label>
              <select
                className={selectClass}
                value={selectedMaster || ''}
                onChange={(e) => setSelectedMaster(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Выберите мастера</option>
                {filteredMasters.map((master) => (
                  <option key={master.id} value={master.id}>
                    {master.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <button type="button" onClick={prevMonth} className={ghostButtonClass} aria-label="Предыдущий месяц">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className={`min-w-[160px] rounded-2xl px-4 py-3 text-center text-sm font-medium ${
                isDark ? 'bg-white/[0.04] text-white' : 'bg-white text-[#111113] border border-black/[0.08]'
              }`}>
                {MONTH_NAMES[month]} {year}
              </div>
              <button type="button" onClick={nextMonth} className={ghostButtonClass} aria-label="Следующий месяц">
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={resetToCurrentMonth}
                className={`min-h-[40px] rounded-2xl px-4 text-sm font-medium transition-all duration-200 ${
                  isDark
                    ? 'bg-white/[0.04] text-white/92 hover:bg-white/[0.08] hover:text-white'
                    : 'border border-[#cfd2d8] bg-white text-[#111113] shadow-[0_1px_2px_rgba(15,23,42,0.06)] hover:bg-[#f3f4f6]'
                }`}
              >
                Текущий месяц
              </button>
            </div>
          </div>
        </section>

        {!selectedMaster ? (
          <section className={`rounded-[20px] p-12 text-center ${panelClass}`}>
            <div className="mx-auto max-w-md">
              <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${isDark ? 'bg-white/[0.05] text-gray-300' : 'bg-white border border-black/[0.08] text-gray-500'}`}>
                <CalendarDays className="h-6 w-6" />
              </div>
              <h2 className={`text-lg font-semibold ${titleClass}`}>Выберите мастера</h2>
              <p className={`mt-2 text-sm ${mutedClass}`}>
                После выбора можно сразу редактировать календарь на нужный месяц.
              </p>
            </div>
          </section>
        ) : (
          <section className={`rounded-[20px] p-5 ${panelClass}`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className={`text-base font-semibold ${titleClass}`}>{selectedMasterObj?.name}</h2>
                <p className={`mt-1 text-sm ${mutedClass}`}>Изменения сохраняются сразу после выбора статуса.</p>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {Object.entries(STATUS_LABELS).map(([key, value]) => (
                <div key={key} className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${statusMeta[key as Exclude<DayStatus, null>].pill}`}>
                  <span className={`h-2 w-2 rounded-full ${statusMeta[key as Exclude<DayStatus, null>].dot}`} />
                  {value}
                </div>
              ))}
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${isDark ? 'bg-white/[0.05] text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                <span className={`h-2 w-2 rounded-full ${isDark ? 'bg-[#111113] ring-1 ring-[#313136]' : 'bg-white ring-1 ring-[#d1d5db]'}`} />
                Не задано
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className={`h-8 w-8 animate-spin rounded-full border-2 border-transparent ${isDark ? 'border-t-white border-r-white/40' : 'border-t-[#111113] border-r-gray-300'}`} />
              </div>
            ) : (
              <div className="overflow-x-auto -mx-1 px-1">
                <div className="min-w-[760px]">
                  <div className="mb-3 grid grid-cols-7 gap-2">
                    {DAY_NAMES.map((dayName) => (
                      <div key={dayName} className={`px-2 py-2 text-center text-xs font-medium uppercase tracking-[0.16em] ${mutedClass}`}>
                        {dayName}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: firstDay }).map((_, index) => (
                      <div
                        key={`empty-${index}`}
                        className={`min-h-[124px] rounded-[20px] border border-dashed ${isDark ? 'border-[#2a2a2f]' : 'border-[#ececf1]'}`}
                      />
                    ))}

                    {Array.from({ length: daysInMonth }).map((_, index) => {
                      const day = index + 1
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                      const status = getStatus(day)
                      const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
                      const isSaving = saving === dateStr
                      const dayOfWeek = new Date(year, month, day).getDay()
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

                      return (
                        <div
                          key={day}
                          className={`group relative min-h-[124px] rounded-[20px] border p-3 transition ${
                            isDark
                              ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'
                              : 'border-black/[0.08] bg-white hover:bg-[#fcfcfd]'
                          } ${isToday ? (isDark ? 'ring-1 ring-white/30' : 'ring-1 ring-[#111113]/12') : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className={`text-lg font-semibold ${isToday ? titleClass : isWeekend ? (isDark ? 'text-red-300' : 'text-red-500') : titleClass}`}>
                              {day}
                            </div>
                            {status ? (
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${statusMeta[status].pill}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${statusMeta[status].dot}`} />
                                {STATUS_LABELS[status]}
                              </span>
                            ) : (
                              <span className={`text-[11px] ${mutedClass}`}>Не задано</span>
                            )}
                          </div>

                          <div className="mt-4 grid gap-1.5">
                            {Object.entries(STATUS_LABELS).map(([key, value]) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setDayStatus(day, key as DayStatus)}
                                className={`rounded-xl px-3 py-2 text-left text-xs font-medium transition ${
                                  statusMeta[key as Exclude<DayStatus, null>].button
                                } ${status === key ? 'ring-1 ring-current/20' : 'opacity-80 hover:opacity-100'}`}
                              >
                                {value}
                              </button>
                            ))}

                            {status && (
                              <button
                                type="button"
                                onClick={() => clearDay(day)}
                                className={`rounded-xl px-3 py-2 text-left text-xs font-medium transition ${
                                  isDark
                                    ? 'bg-white/[0.04] text-gray-300 hover:bg-white/[0.08] hover:text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                Очистить
                              </button>
                            )}
                          </div>

                          {isSaving && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-[20px] bg-black/20">
                              <div className={`h-6 w-6 animate-spin rounded-full border-2 border-transparent ${isDark ? 'border-t-white border-r-white/40' : 'border-t-[#111113] border-r-gray-300'}`} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
