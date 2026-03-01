'use client'

import { useState, useEffect, useMemo } from 'react'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Master { id: number; name: string; cityIds?: number[] }
interface Schedule {
  id: number
  masterId: number
  date: string
  status: 'working' | 'day_off' | 'vacation'
  note: string | null
}

type DayStatus = 'working' | 'day_off' | 'vacation' | null

const STATUS_LABELS: Record<string, string> = {
  working: 'Работает',
  day_off: 'Выходной',
  vacation: 'Отпуск',
}
const STATUS_COLORS: Record<string, string> = {
  working: 'bg-green-500',
  day_off: 'bg-gray-400',
  vacation: 'bg-blue-400',
}
const STATUS_TEXT: Record<string, string> = {
  working: 'text-green-700 bg-green-100',
  day_off: 'text-gray-600 bg-gray-100',
  vacation: 'text-blue-700 bg-blue-100',
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
    apiClient.getMasters().then(r => {
      if (r.success) setMasters(Array.isArray(r.data) ? r.data : [])
    }).catch(() => {})
    apiClient.getCities().then(c => setCities(c)).catch(() => {})
  }, [])

  const filteredMasters = useMemo(() => {
    if (!cityFilter) return masters
    return masters.filter(m => m.cityIds?.includes(Number(cityFilter)))
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
    } catch { toast.error('Не удалось загрузить расписание') }
    finally { setIsLoading(false) }
  }

  useEffect(() => { loadSchedule() }, [selectedMaster, year, month])

  const getStatus = (day: number): DayStatus => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return schedules.find(s => s.date.startsWith(dateStr))?.status || null
  }

  const setDayStatus = async (day: number, status: DayStatus) => {
    if (!selectedMaster || !status) return
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSaving(dateStr)
    try {
      await apiClient.upsertMasterSchedule({ masterId: selectedMaster, date: dateStr, status })
      setSchedules(prev => {
        const filtered = prev.filter(s => !s.date.startsWith(dateStr))
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
    const existing = schedules.find(s => s.date.startsWith(dateStr))
    if (!existing) return
    setSaving(dateStr)
    try {
      await apiClient.deleteMasterSchedule(existing.id)
      setSchedules(prev => prev.filter(s => !s.date.startsWith(dateStr)))
    } catch (e: any) { toast.error(e.message || 'Ошибка') }
    finally { setSaving(null) }
  }

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)
  const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
  const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  const selectedMasterObj = masters.find(m => m.id === selectedMaster)

  const selectCls = `px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-800'}`

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
    <div className="px-6 py-6">

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select className={selectCls} value={cityFilter} onChange={e => { setCityFilter(e.target.value); setSelectedMaster(null) }}>
          <option value="">Все города</option>
          {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className={`${selectCls} min-w-[200px]`} value={selectedMaster || ''} onChange={e => setSelectedMaster(e.target.value ? Number(e.target.value) : null)}>
          <option value="">Выберите мастера</option>
          {filteredMasters.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {!selectedMaster ? (
        <div className={`text-center py-16 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Выберите мастера для просмотра и редактирования расписания
        </div>
      ) : (
        <div className={`rounded-xl border ${isDark ? 'bg-[#2a3441] border-gray-700/50' : 'bg-white border-gray-200 shadow-sm'}`}>
          {/* Calendar Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700/50">
            <div>
              <span className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{selectedMasterObj?.name}</span>
              <span className={`text-sm ml-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>— расписание</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}><ChevronLeft className="w-4 h-4" /></button>
              <span className={`font-medium w-36 text-center ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{MONTH_NAMES[month]} {year}</span>
              <button onClick={nextMonth} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Legend */}
          <div className="px-4 py-2 flex gap-4 flex-wrap">
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5 text-xs">
                <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[k]}`} />
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>{v}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-xs">
              <div className={`w-3 h-3 rounded-full ${isDark ? 'bg-[#1e2530] border border-gray-600' : 'bg-white border border-gray-300'}`} />
              <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Не задано</span>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></div>
          ) : (
            <div className="p-4">
              {/* Day names */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAY_NAMES.map(d => (
                  <div key={d} className={`text-center text-xs font-medium py-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{d}</div>
                ))}
              </div>

              {/* Days */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells */}
                {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const status = getStatus(day)
                  const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
                  const isSaving = saving === dateStr
                  const dayOfWeek = new Date(year, month, day).getDay()
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

                  return (
                    <div
                      key={day}
                      className={`relative rounded-lg aspect-square flex flex-col items-center justify-center cursor-pointer transition-all group
                        ${isToday ? 'ring-2 ring-teal-500' : ''}
                        ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}
                      `}
                    >
                      <div className={`text-sm font-medium ${isToday ? 'text-teal-600' : isWeekend ? (isDark ? 'text-red-400' : 'text-red-500') : (isDark ? 'text-gray-300' : 'text-gray-700')}`}>{day}</div>
                      {status && <div className={`w-2 h-2 rounded-full mt-0.5 ${STATUS_COLORS[status]}`} />}
                      {isSaving && <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg"><div className="w-3 h-3 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" /></div>}

                      {/* Context menu on hover */}
                      <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:flex flex-col gap-0.5 z-20 rounded-lg shadow-lg border p-1 min-w-[110px] ${isDark ? 'bg-[#2a3441] border-gray-600' : 'bg-white border-gray-200'}`}>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                          <button
                            key={k}
                            onClick={() => setDayStatus(day, k as DayStatus)}
                            className={`text-left px-2 py-1 rounded text-xs ${STATUS_TEXT[k]} hover:opacity-80 ${status === k ? 'font-semibold' : ''}`}
                          >
                            {v}
                          </button>
                        ))}
                        {status && (
                          <button onClick={() => clearDay(day)} className={`text-left px-2 py-1 rounded text-xs ${isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                            Очистить
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </div>
  )
}
