'use client'

import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { reportsApi } from '@/lib/api/modules/reports'
import { ALL_PURPOSES, PAYMENT_PURPOSES, reportTabs, ReportData, ReportType } from '@/components/reports/report-constants'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

export default function ReportsPage() {
  // Тема
  const theme = useDesignStore((state) => state.theme)
  const isDark = theme === 'dark'
  
  // Состояние выбора
  const [selectedReport, setSelectedReport] = useState<ReportType>('cash')
  const [availableCities, setAvailableCities] = useState<Array<{ id: number; name: string }>>([])
  const [selectedCityIds, setSelectedCityIds] = useState<number[]>([])
  
  // Период
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date()
    date.setDate(1)
    return date.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  
  // Фильтр по назначению платежа
  const [filterByPurpose, setFilterByPurpose] = useState(false)
  const [selectedPurposes, setSelectedPurposes] = useState<string[]>([])
  
  // Выпадающий список
  const [showFilters, setShowFilters] = useState(false)
  
  // Черновики фильтров
  const [draftSelectedCityIds, setDraftSelectedCityIds] = useState<number[]>([])
  const [draftDateFrom, setDraftDateFrom] = useState('')
  const [draftDateTo, setDraftDateTo] = useState('')
  const [activeQuickPeriod, setActiveQuickPeriod] = useState<'day' | 'week' | 'month' | 'custom' | null>(null)
  const [draftFilterByPurpose, setDraftFilterByPurpose] = useState(false)
  const [draftSelectedPurposes, setDraftSelectedPurposes] = useState<string[]>([])
  
  // Состояние UI
  const [isLoadingCities, setIsLoadingCities] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const mobileTabsTrackRef = useRef<HTMLDivElement>(null)
  const mobileTabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const mobileIndicatorFirstLayout = useRef(true)
  const [mobileIndicatorStyle, setMobileIndicatorStyle] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    opacity: 0,
    transition: 'none' as string,
  })
  
  // Загрузка списка городов
  useEffect(() => {
    reportsApi.getCities().then((cities: Array<{ id: number; name: string }>) => {
      setAvailableCities(cities)
      const ids = cities.map(c => c.id)
      setSelectedCityIds(ids)
      setDraftSelectedCityIds(ids)
    }).catch(() => {}).finally(() => setIsLoadingCities(false))
  }, [])
  
  // Открытие панели фильтров
  const openFiltersPanel = () => {
    setDraftSelectedCityIds(selectedCityIds)
    setDraftDateFrom(dateFrom)
    setDraftDateTo(dateTo)
    setDraftFilterByPurpose(filterByPurpose)
    setDraftSelectedPurposes(selectedPurposes)
    setActiveQuickPeriod(null)
    setShowFilters(true)
  }
  
  // Применение фильтров
  const applyFilters = () => {
    setSelectedCityIds(draftSelectedCityIds)
    setDateFrom(draftDateFrom)
    setDateTo(draftDateTo)
    setFilterByPurpose(draftFilterByPurpose)
    setSelectedPurposes(draftSelectedPurposes)
    setShowFilters(false)
  }
  
  // Сброс фильтров
  const resetFilters = () => {
    setDraftSelectedCityIds(availableCities.map(c => c.id))
    setDraftDateFrom(() => {
      const date = new Date()
      date.setDate(1)
      return date.toISOString().split('T')[0]
    })
    setDraftDateTo(new Date().toISOString().split('T')[0])
    setActiveQuickPeriod(null)
    setDraftFilterByPurpose(false)
    setDraftSelectedPurposes([])
  }

  const toggleQuickPeriod = (period: 'day' | 'week' | 'month' | 'custom') => {
    if (activeQuickPeriod === period) {
      setActiveQuickPeriod(null)
      setDraftDateFrom('')
      setDraftDateTo('')
      return
    }

    if (period === 'custom') {
      setActiveQuickPeriod('custom')
      return
    }

    const now = new Date()
    const end = new Date().toISOString().split('T')[0]
    let start = end

    if (period === 'week') {
      start = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0]
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    }

    setActiveQuickPeriod(period)
    setDraftDateFrom(start)
    setDraftDateTo(end)
  }
  
  // Обработка выбора назначения платежа
  const handlePurposeToggle = (purpose: string) => {
    setDraftSelectedPurposes(prev => {
      if (prev.includes(purpose)) {
        return prev.filter(p => p !== purpose)
      } else {
        return [...prev, purpose]
      }
    })
  }
  
  // Выбрать все назначения
  const handleSelectAllPurposes = () => {
    if (draftSelectedPurposes.length === ALL_PURPOSES.length) {
      setDraftSelectedPurposes([])
    } else {
      setDraftSelectedPurposes(ALL_PURPOSES.map(p => p.value))
    }
  }
  
  // Генерация отчёта
  const generateReport = useCallback(async () => {
    if (selectedCityIds.length === 0) {
      toast.error('Выберите город')
      return
    }
    
    setIsGenerating(true)
    setReportData(null)
    
    try {
      let data: any = null
      
      switch (selectedReport) {
        case 'cash':
          if (filterByPurpose) {
            // Детальный отчёт с группировкой по назначениям платежа
            const cashResponse = await reportsApi.getCashByPurpose({
              startDate: dateFrom,
              endDate: dateTo,
              cityId: selectedCityIds.length === 1 ? selectedCityIds[0] : undefined,
              purposes: selectedPurposes.length > 0 ? selectedPurposes : undefined
            })
            
            if (cashResponse.success && cashResponse.data) {
              let cashResults = cashResponse.data.cities || []
              let totals = cashResponse.data.totals
              
              // Фильтруем по выбранным городам только если выбраны не все
              if (selectedCityIds.length < availableCities.length) {
                cashResults = cashResults.filter((c: any) => selectedCityIds.includes(c.cityId))
                // Пересчитываем totals для отфильтрованных городов
                totals = cashResults.reduce((acc: any, curr: any) => ({
                  income: acc.income + (curr.totalIncome || 0),
                  expense: acc.expense + (curr.totalExpense || 0),
                  balance: acc.balance + (curr.balance || 0)
                }), { income: 0, expense: 0, balance: 0 })
              }
              
              data = { cities: cashResults, totals, groupByPurpose: true }
            }
          } else {
            // Простой отчёт - итоги по городам (используем тот же API для консистентности)
            const cashResponse = await reportsApi.getCashByPurpose({
              startDate: dateFrom,
              endDate: dateTo,
              cityId: selectedCityIds.length === 1 ? selectedCityIds[0] : undefined
            })
            
            if (cashResponse.success && cashResponse.data) {
              let cityStats = cashResponse.data.cities || []
              let totals = cashResponse.data.totals
              
              // Фильтруем по выбранным городам только если выбраны не все
              if (selectedCityIds.length < availableCities.length) {
                cityStats = cityStats.filter((c: any) => selectedCityIds.includes(c.cityId))
                // Пересчитываем totals только для отфильтрованных городов
                totals = cityStats.reduce((acc: any, curr: any) => ({
                  income: acc.income + (curr.totalIncome || 0),
                  expense: acc.expense + (curr.totalExpense || 0),
                  balance: acc.balance + (curr.balance || 0)
                }), { income: 0, expense: 0, balance: 0 })
              }
              
              // Преобразуем в простой формат (без breakdown по назначениям)
              const cashResults = cityStats.map((city: any) => ({
                cityId: city.cityId,
                cityName: city.cityName || city.city,
                income: city.totalIncome || 0,
                expense: city.totalExpense || 0,
                balance: city.balance || 0
              }))
              
              data = { cities: cashResults, totals, groupByPurpose: false }
            }
          }
          break
          
        case 'orders':
          // Используем reports API для получения статистики заказов
          const ordersReportResponse = await reportsApi.getCitiesReport({
            startDate: dateFrom,
            endDate: dateTo,
            cityId: selectedCityIds.length === 1 ? selectedCityIds[0] : undefined
          })
          
          if (ordersReportResponse.success && ordersReportResponse.data) {
            const cityStats = ordersReportResponse.data
            
            // Фильтруем по выбранным городам
            const filteredStats = selectedCityIds.length === availableCities.length 
              ? cityStats 
              : cityStats.filter((c: any) => selectedCityIds.includes(c.cityId))
            
            const ordersResults = filteredStats.map((city: any) => ({
              cityId: city.cityId,
              cityName: city.cityName || city.city,
              totalOrders: city.stats?.totalOrders || 0,
              notOrders: city.stats?.notOrders || 0,
              zeroOrders: city.stats?.zeroOrders || 0,
              completedOrders: city.stats?.completedOrders || 0,
              microUnder1500: city.stats?.microUnder1500 || 0,
              micro1500to10000: city.stats?.micro1500to10000 || 0,
              over10kCount: city.stats?.over10kCount || 0,
              maxCheck: city.stats?.maxCheck || 0,
              turnover: city.stats?.turnover || 0,
              avgCheck: city.stats?.avgCheck || 0
            }))
            
            const totals = ordersResults.reduce((acc: any, curr: any) => ({
              totalOrders: acc.totalOrders + curr.totalOrders,
              notOrders: acc.notOrders + curr.notOrders,
              zeroOrders: acc.zeroOrders + curr.zeroOrders,
              completedOrders: acc.completedOrders + curr.completedOrders,
              microUnder1500: acc.microUnder1500 + curr.microUnder1500,
              micro1500to10000: acc.micro1500to10000 + curr.micro1500to10000,
              over10kCount: acc.over10kCount + curr.over10kCount,
              maxCheck: Math.max(acc.maxCheck, curr.maxCheck),
              turnover: acc.turnover + curr.turnover
            }), { 
              totalOrders: 0, notOrders: 0, zeroOrders: 0, completedOrders: 0, 
              microUnder1500: 0, micro1500to10000: 0, over10kCount: 0, maxCheck: 0, turnover: 0 
            })
            
            data = {
              cities: ordersResults,
              totals: {
                ...totals,
                avgCheck: totals.completedOrders > 0 ? totals.turnover / totals.completedOrders : 0
              }
            }
          }
          break
          
        case 'campaigns':
          // Отчёт по рекламным кампаниям с группировкой по городам и типам РК
          const campaignsResponse = await reportsApi.getCampaignsReport({
            startDate: dateFrom,
            endDate: dateTo,
            cityId: selectedCityIds.length === 1 ? selectedCityIds[0] : undefined
          })
          
          if (campaignsResponse.success && campaignsResponse.data) {
            let cityData = campaignsResponse.data
            
            // Фильтруем по выбранным городам
            if (selectedCityIds.length < availableCities.length) {
              cityData = cityData.filter((c: any) => selectedCityIds.includes(c.cityId))
            }
            
            // Группируем кампании по типу (rk) внутри каждого города
            const campaignTotals = { ordersCount: 0, revenue: 0, profit: 0 }
            
            const citiesWithGroupedCampaigns = cityData.map((cityReport: any) => {
              // Группируем кампании по rk.name
              const typeMap = new Map<string, { ordersCount: number; revenue: number; profit: number; rkId: number }>()
              
              cityReport.campaigns?.forEach((campaign: any) => {
                const typeName = campaign.rk?.name || 'Неизвестно'
                if (!typeMap.has(typeName)) {
                  typeMap.set(typeName, { ordersCount: 0, revenue: 0, profit: 0, rkId: campaign.rkId || 0 })
                }
                const typeData = typeMap.get(typeName)!
                typeData.ordersCount += campaign.ordersCount
                typeData.revenue += campaign.revenue
                typeData.profit += campaign.profit
              })
              
              // Преобразуем в массив и сортируем по обороту
              const groupedCampaigns = Array.from(typeMap.entries())
                .map(([typeName, data]) => ({
                  typeName,
                  rkId: data.rkId,
                  ordersCount: data.ordersCount,
                  revenue: data.revenue,
                  profit: data.profit
                }))
                .sort((a, b) => b.revenue - a.revenue)
              
              // Считаем итоги по городу
              const cityTotals = groupedCampaigns.reduce((acc, c) => ({
                ordersCount: acc.ordersCount + c.ordersCount,
                revenue: acc.revenue + c.revenue,
                profit: acc.profit + c.profit
              }), { ordersCount: 0, revenue: 0, profit: 0 })
              
              // Добавляем к общим итогам
              campaignTotals.ordersCount += cityTotals.ordersCount
              campaignTotals.revenue += cityTotals.revenue
              campaignTotals.profit += cityTotals.profit
              
              return {
                cityId: cityReport.cityId,
                cityName: cityReport.cityName || cityReport.city,
                campaigns: groupedCampaigns,
                totals: cityTotals
              }
            })
            
            // Сортируем города по обороту
            citiesWithGroupedCampaigns.sort((a: any, b: any) => b.totals.revenue - a.totals.revenue)
            
            data = {
              cities: citiesWithGroupedCampaigns,
              totals: campaignTotals,
              groupByCity: true
            }
          }
          break
      }
      
      setReportData({
        type: selectedReport,
        generatedAt: new Date().toISOString(),
        period: { from: dateFrom, to: dateTo },
        cityIds: selectedCityIds,
        data,
        purposes: filterByPurpose && selectedPurposes.length > 0 ? selectedPurposes : undefined
      } as ReportData)
      
      toast.success('Отчёт сформирован')
      
    } catch (error) {
      logger.error('Failed to generate report', { error: String(error) })
      toast.error('Ошибка при формировании отчёта')
    } finally {
      setIsGenerating(false)
    }
  }, [selectedReport, selectedCityIds, dateFrom, dateTo, availableCities.length, filterByPurpose, selectedPurposes])
  
  // Форматирование валюты
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(amount)
  }
  
  // Форматирование даты
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const updateMobileTabsIndicator = useCallback(() => {
    const track = mobileTabsTrackRef.current
    if (!track) return

    const idx = reportTabs.findIndex((tab) => tab.id === selectedReport)
    if (idx < 0) {
      setMobileIndicatorStyle((prev) => ({ ...prev, opacity: 0, transition: 'opacity 180ms ease-out' }))
      return
    }

    const tab = mobileTabRefs.current[idx]
    if (!tab) return

    const tr = track.getBoundingClientRect()
    const r = tab.getBoundingClientRect()
    const spring =
      'left 340ms cubic-bezier(0.34, 1.28, 0.64, 1), top 340ms cubic-bezier(0.34, 1.28, 0.64, 1), width 340ms cubic-bezier(0.34, 1.28, 0.64, 1), height 340ms cubic-bezier(0.34, 1.28, 0.64, 1), opacity 180ms ease-out'

    setMobileIndicatorStyle({
      left: r.left - tr.left,
      top: r.top - tr.top,
      width: r.width,
      height: r.height,
      opacity: 1,
      transition: mobileIndicatorFirstLayout.current ? 'none' : spring,
    })
    mobileIndicatorFirstLayout.current = false
  }, [selectedReport])

  useLayoutEffect(() => {
    updateMobileTabsIndicator()
  }, [updateMobileTabsIndicator])

  useLayoutEffect(() => {
    const track = mobileTabsTrackRef.current
    if (!track) return
    const ro = new ResizeObserver(() => updateMobileTabsIndicator())
    ro.observe(track)
    window.addEventListener('orientationchange', updateMobileTabsIndicator)
    return () => {
      ro.disconnect()
      window.removeEventListener('orientationchange', updateMobileTabsIndicator)
    }
  }, [updateMobileTabsIndicator])

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'}`}>
      <div className="px-4 py-6">
        <div className="w-full">
          
          {/* Табы типов отчётов + кнопка фильтров */}
          <div className="mb-4 animate-slide-in-left">
            <div className="flex items-center gap-2">
              {/* Табы с прокруткой */}
              <div className="flex-1 min-w-0">
                <div className="md:hidden">
                  <div
                    ref={mobileTabsTrackRef}
                    className={`relative inline-flex w-full max-w-full items-center gap-0.5 rounded-[22px] border p-1 ${
                      isDark ? 'border-white/10 bg-[#111113]/90' : 'border-black/[0.08] bg-white'
                    }`}
                  >
                    <div
                      aria-hidden
                      className={`pointer-events-none absolute will-change-[left,top,width,height] rounded-[16px] ${
                        isDark
                          ? 'bg-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                          : 'bg-[#0a4f42] shadow-[0_8px_20px_rgba(10,79,66,0.22)]'
                      }`}
                      style={{
                        left: mobileIndicatorStyle.left,
                        top: mobileIndicatorStyle.top,
                        width: mobileIndicatorStyle.width,
                        height: mobileIndicatorStyle.height,
                        opacity: mobileIndicatorStyle.opacity,
                        transition: mobileIndicatorStyle.transition,
                      }}
                    />
                    {reportTabs.map((tab, i) => (
                      <button
                        key={tab.id}
                        ref={(el) => {
                          mobileTabRefs.current[i] = el
                        }}
                        onClick={() => setSelectedReport(tab.id)}
                        className={`relative z-[1] min-h-[34px] flex-1 rounded-[16px] px-2 py-1 text-[13px] font-semibold leading-tight transition-colors duration-200 ${
                          selectedReport === tab.id
                            ? 'text-white'
                            : isDark
                              ? 'text-white/80 hover:bg-white/[0.06] hover:text-white'
                              : 'text-[#3a3a3c] hover:bg-black/[0.04] hover:text-[#111113]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="hidden md:block overflow-x-auto scrollbar-hide">
                  <div className="flex gap-2 w-max">
                    {reportTabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setSelectedReport(tab.id)}
                        className={`min-h-[40px] px-4 text-sm font-medium rounded-2xl transition-all duration-200 whitespace-nowrap ${
                          selectedReport === tab.id
                            ? (isDark ? 'bg-white/[0.08] text-white' : 'bg-[#0a4f42] text-white')
                            : (isDark ? 'text-white/92 hover:bg-white/[0.04] hover:text-white bg-transparent' : 'text-[#3a3a3c] hover:-translate-y-[1px] hover:bg-black/[0.035] hover:text-[#111113] bg-transparent')
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Иконка фильтров */}
              <button
                onClick={openFiltersPanel}
                className={`relative flex items-center justify-center min-h-[40px] w-[40px] flex-shrink-0 rounded-2xl transition-all duration-200 bg-transparent ${
                  isDark 
                    ? 'text-white/92 hover:bg-white/[0.04] hover:text-white' 
                    : 'text-[#3a3a3c] hover:-translate-y-[1px] hover:bg-black/[0.035] hover:text-[#111113]'
                }`}
                title="Фильтры"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {/* Индикатор активных фильтров */}
                {(selectedCityIds.length < availableCities.length || filterByPurpose) && (
                  <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-teal-500 rounded-full border-2 ${
                    isDark ? 'border-[#1e2530]' : 'border-white'
                  }`}></span>

                )}
              </button>

              {/* Кнопка генерации */}
              <button
                onClick={generateReport}
                disabled={isGenerating || isLoadingCities}
                className={`flex-shrink-0 min-h-[40px] px-4 rounded-2xl transition-all duration-200 text-sm font-medium flex items-center gap-2 ${
                  isDark
                    ? 'bg-white text-[#111113] hover:bg-gray-200 disabled:bg-white/40 disabled:text-[#111113]/60'
                    : 'bg-[#0a4f42] text-white hover:bg-[#083f35] disabled:bg-[#0a4f42]/40'
                }`}
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="hidden sm:inline">Формирование...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="hidden sm:inline">Сформировать</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Выезжающая панель фильтров справа */}
          <>
              {/* Затемнение фона */}
              <div 
                className={`fixed inset-0 z-40 transition-opacity duration-300 ${
                  showFilters ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                } ${isDark ? 'bg-black/50' : 'bg-black/30 backdrop-blur-sm'}`}
                onClick={() => setShowFilters(false)}
              />
              
              {/* Панель фильтров */}
              <div className={`fixed top-16 md:top-4 right-0 md:right-4 h-[calc(100%-4rem)] md:h-[calc(100vh-2rem)] w-full sm:w-[360px] z-50 transform transition-all duration-300 ease-out overflow-y-auto md:rounded-[30px] ${
                showFilters ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'
              } ${
                isDark
                  ? 'bg-[#111113]/92 backdrop-blur-xl border-l md:border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.35)]'
                  : 'bg-white border-l md:border border-black/[0.08] shadow-[0_24px_60px_rgba(15,23,42,0.12)]'
              }`}>
                {/* Заголовок панели - только на десктопе */}
                <div className={`hidden md:flex sticky top-0 border-b px-4 py-4 items-center justify-start z-10 ${
                  isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'
                }`}>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6e6e73] transition-colors hover:bg-black/[0.04] hover:text-[#111113] dark:text-white/60 dark:hover:bg-white/[0.05] dark:hover:text-white"
                    title="Закрыть"
                  >
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                </div>

                {/* Кнопка скрыть - только на мобильных */}
                <div className={`md:hidden sticky top-0 border-b px-4 py-3 z-10 ${
                  isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'
                }`}>
                  <button
                    onClick={() => setShowFilters(false)}
                    className={`w-full py-3 px-4 rounded-2xl text-base font-medium transition-colors flex items-center justify-center gap-2 ${
                      isDark ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white' : 'bg-black/[0.04] hover:bg-black/[0.07] text-[#111113]'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    Скрыть фильтры
                  </button>
                </div>

                {/* Содержимое фильтров */}
                <div className="p-6 space-y-8">
                  {/* Секция: Период */}
                  <div className="space-y-4">
                    <h3 className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>Период</h3>

                    <div className="flex gap-2 flex-wrap">
                      {[
                        { id: 'day', label: 'День' },
                        { id: 'week', label: 'Неделя' },
                        { id: 'month', label: 'Месяц' },
                        { id: 'custom', label: 'Свой' },
                      ].map((period) => (
                        <button
                          key={period.id}
                          onClick={() => toggleQuickPeriod(period.id as 'day' | 'week' | 'month' | 'custom')}
                          className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all ${
                            activeQuickPeriod === period.id
                              ? (isDark ? 'bg-white text-[#111113]' : 'bg-[#0a4f42] text-white')
                              : isDark
                                ? 'bg-white/[0.04] text-gray-300 hover:bg-white/[0.08]'
                                : 'bg-[#e7eaef] border border-[#d1d5db] text-[#111113] hover:bg-[#dde2e8]'
                          }`}
                        >
                          {period.label}
                        </button>
                      ))}
                    </div>

                    {activeQuickPeriod === 'custom' && (
                      <div className="mt-3">
                        <DateRangePicker
                          startDate={draftDateFrom}
                          endDate={draftDateTo}
                          onChange={(start, end) => {
                            setDraftDateFrom(start)
                            setDraftDateTo(end)
                            setActiveQuickPeriod('custom')
                          }}
                          isDark={isDark}
                        />
                      </div>
                    )}
                  </div>

                  <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />

                  {/* Секция: Город */}
                  <div className="space-y-4">
                    <h3 className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>Город</h3>
                    
                    <div>
                      <Select 
                        value={draftSelectedCityIds.length === availableCities.length ? 'all' : (draftSelectedCityIds[0]?.toString() || 'all')}
                        onValueChange={(value) => {
                          if (value === 'all') {
                            setDraftSelectedCityIds(availableCities.map(c => c.id))
                          } else {
                            setDraftSelectedCityIds([Number(value)])
                          }
                        }}
                      >
                        <SelectTrigger className={`w-full min-h-[44px] rounded-2xl border shadow-sm focus:ring-0 focus-visible:ring-0 data-[state=open]:ring-0 ${
                          isDark
                            ? 'bg-white/[0.04] text-white border-white/10 data-[state=open]:border-white/20'
                            : 'bg-white text-[#111113] border-[#d1d5db] data-[state=open]:border-[#c4c9d1]'
                        }`}>
                          <SelectValue placeholder="Выберите город" />
                        </SelectTrigger>
                        <SelectContent className={isDark ? 'bg-[#1e1e20] border-white/10' : 'bg-white border-black/[0.08]'}>
                          <SelectItem value="all" className={isDark ? 'text-gray-100 focus:bg-white/10 focus:text-white' : 'text-gray-800 focus:bg-gray-100 focus:text-gray-900'}>Все города</SelectItem>
                          {availableCities.map(city => (
                            <SelectItem key={city.id} value={city.id.toString()} className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>{city.name}</SelectItem>

                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Секция: Назначение платежа (только для отчёта по кассе) */}
                  {selectedReport === 'cash' && (
                    <>
                      <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>Назначение платежа</h3>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={draftFilterByPurpose}
                              onChange={(e) => setDraftFilterByPurpose(e.target.checked)}
                              className={`h-4 w-4 rounded border-gray-400 focus:ring-0 ${isDark ? 'accent-white' : 'accent-[#0a4f42]'}`}
                            />
                            <span className={`text-xs ${isDark ? 'text-white/80' : 'text-gray-500'}`}>Группировать</span>
                          </label>
                        </div>
                        
                        {draftFilterByPurpose && (
                          <div className={`p-3 rounded-2xl space-y-2 ${isDark ? 'bg-white/[0.04] border border-white/10' : 'bg-gray-50'}`}>
                            <label className={`flex items-center gap-2 cursor-pointer p-1.5 rounded ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-black/[0.03]'}`}>
                              <input
                                type="checkbox"
                                checked={draftSelectedPurposes.length === ALL_PURPOSES.length}
                                onChange={handleSelectAllPurposes}
                                className={`h-4 w-4 rounded border-gray-400 focus:ring-0 ${isDark ? 'accent-white' : 'accent-[#0a4f42]'}`}
                              />
                              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>Выбрать все</span>
                            </label>
                            <hr className={isDark ? 'border-white/10' : 'border-gray-200'} />
                            <div
                              className="max-h-40 overflow-y-auto space-y-1"
                              style={{ scrollbarColor: isDark ? '#9ca3af #334155' : '#9ca3af #e5e7eb' }}
                            >
                              {ALL_PURPOSES.map(purpose => (
                                <label 
                                  key={purpose.value} 
                                  className={`flex items-center gap-2 cursor-pointer p-1.5 rounded ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-black/[0.03]'}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={draftSelectedPurposes.includes(purpose.value)}
                                    onChange={() => handlePurposeToggle(purpose.value)}
                                    className={`h-4 w-4 rounded border-gray-400 focus:ring-0 ${isDark ? 'accent-white' : 'accent-[#0a4f42]'}`}
                                  />
                                  <span className={`text-sm ${isDark ? 'text-white/90' : 'text-gray-600'}`}>{purpose.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Нижняя панель с кнопками */}
                <div className={`sticky bottom-0 border-t px-6 py-4 flex gap-3 ${
                  isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'
                }`}>
                  <button
                    onClick={resetFilters}
                    className={`flex-1 py-3.5 rounded-2xl text-[15px] font-semibold transition-colors ${
                      isDark 
                        ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white'
                        : 'border border-[#cfd2d8] bg-white hover:bg-[#f3f4f6] text-[#111113] shadow-[0_1px_2px_rgba(15,23,42,0.06)]'
                    }`}
                  >
                    Сбросить
                  </button>
                  <button
                    onClick={applyFilters}
                    className={`flex-1 py-3.5 rounded-2xl transition-colors text-[15px] font-semibold ${
                      isDark
                        ? 'bg-white hover:bg-gray-200 text-[#111113]'
                        : 'bg-[#0a4f42] hover:bg-[#0a4f42]/90 text-white shadow-md shadow-[#0a4f42]/20'
                    }`}
                  >
                    Применить
                  </button>
                </div>
              </div>
            </>

          {/* Информация о текущих фильтрах */}
          {reportData && (
            <div className={`mb-4 flex items-center justify-between text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span>
                  {reportData.cityIds.length === availableCities.length 
                    ? 'Все города' 
                    : `Город: ${reportData.cityIds.map(id => availableCities.find(c => c.id === id)?.name || id).join(', ')}`
                  }
                </span>
                <span>•</span>
                <span>{formatDate(reportData.period.from)} — {formatDate(reportData.period.to)}</span>
                {reportData.purposes && reportData.purposes.length > 0 && (
                  <>
                    <span>•</span>
                    <span>Назначение: {reportData.purposes.length === ALL_PURPOSES.length ? 'Все' : reportData.purposes.join(', ')}</span>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => window.print()}
                  className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-[#3a4451] text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                  title="Экспорт"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <button 
                  onClick={generateReport}
                  className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-[#3a4451] text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                  title="Обновить"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Состояние загрузки */}
          {isGenerating && (
            <div className="text-center py-8 animate-fade-in">
              <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${isDark ? 'border-white' : 'border-[#0a4f42]'}`}></div>
              <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Формирование отчёта...</p>
            </div>
          )}

          {/* Пустое состояние */}
          {!reportData && !isGenerating && (
            <div className={`text-center py-16 rounded-[20px] border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-black/[0.08]'}`}>
              <svg className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className={`text-lg mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Выберите параметры и нажмите &quot;Сформировать&quot;</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Результат появится здесь</p>
            </div>
          )}

          {/* Таблица результатов */}
          {reportData && !isGenerating && (
            <div className="animate-fade-in">
              
              {/* Таблица кассы (простой режим) */}
              {reportData.type === 'cash' && !reportData.data.groupByPurpose && (
                <div className={`rounded-[20px] shadow-lg overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 ${isDark ? 'bg-white/[0.03]' : 'bg-white'}`}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`border-b-2 ${isDark ? 'bg-white/[0.04] border-white/20' : 'bg-black/[0.02] border-black/10'}`}>
                        <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Город</th>
                        <th className={`text-right py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Приход</th>
                        <th className={`text-right py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Расход</th>
                        <th className={`text-right py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Касса</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data.cities.map((city: any) => (
                        <tr key={city.cityId || city.city} className={`border-b transition-colors ${isDark ? 'border-gray-700 hover:bg-[#3a4451]' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <td className={`py-3 px-4 font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{city.cityName || city.city}</td>
                          <td className={`py-3 px-4 text-right font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(city.income)}</td>
                          <td className={`py-3 px-4 text-right font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(city.expense)}</td>
                          <td className={`py-3 px-4 text-right font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(city.balance)}</td>
                        </tr>
                      ))}
                      <tr className={`font-bold border-t-2 ${isDark ? 'bg-[#3a4451] border-[#0d5c4b]' : 'bg-teal-50 border-[#0d5c4b]'}`}>
                        <td className={`py-3 px-4 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>ИТОГО</td>
                        <td className={`py-3 px-4 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(reportData.data.totals.income)}</td>
                        <td className={`py-3 px-4 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(reportData.data.totals.expense)}</td>
                        <td className={`py-3 px-4 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(reportData.data.totals.balance)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Таблица кассы с группировкой по назначениям */}
              {reportData.type === 'cash' && reportData.data.groupByPurpose && (
                <div className={`rounded-lg shadow-lg overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`border-b-2 ${isDark ? 'bg-[#3a4451] border-[#0d5c4b]' : 'bg-gray-50 border-[#0d5c4b]'}`}>
                        <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Город / Назначение</th>
                        <th className={`text-right py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Приход</th>
                        <th className={`text-right py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Расход</th>
                        <th className={`text-right py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Итого</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data.cities.map((city: any) => (
                        <React.Fragment key={city.cityId || city.city}>
                          <tr className={isDark ? 'bg-[#3a4451]' : 'bg-gray-50'}>
                            <td className={`py-3 px-4 font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{city.cityName || city.city}</td>
                            <td className={`py-3 px-4 text-right font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(city.totalIncome)}</td>
                            <td className={`py-3 px-4 text-right font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(city.totalExpense)}</td>
                            <td className={`py-3 px-4 text-right font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(city.balance)}</td>
                          </tr>
                          {city.purposes?.map((purpose: any) => (
                            <tr key={`${city.cityId || city.city}-${purpose.purpose}`} className={`border-b transition-colors ${isDark ? 'border-gray-700 hover:bg-[#3a4451]' : 'border-gray-100 hover:bg-gray-50'}`}>
                              <td className={`py-2 px-4 pl-8 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{purpose.purpose}</td>
                              <td className={`py-2 px-4 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{purpose.income > 0 ? formatCurrency(purpose.income) : '-'}</td>
                              <td className={`py-2 px-4 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{purpose.expense > 0 ? formatCurrency(purpose.expense) : '-'}</td>
                              <td className={`py-2 px-4 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(purpose.balance)}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                      <tr className={`font-bold border-t-2 ${isDark ? 'bg-[#3a4451] border-[#0d5c4b]' : 'bg-teal-50 border-[#0d5c4b]'}`}>
                        <td className={`py-3 px-4 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>ИТОГО</td>
                        <td className={`py-3 px-4 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(reportData.data.totals.income)}</td>
                        <td className={`py-3 px-4 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(reportData.data.totals.expense)}</td>
                        <td className={`py-3 px-4 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(reportData.data.totals.balance)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Таблица заказов */}
              {reportData.type === 'orders' && (
                <div className={`rounded-lg shadow-lg overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
                  <table className="w-full text-sm min-w-[800px]">
                    <thead>
                      <tr className={`border-b-2 ${isDark ? 'bg-[#3a4451] border-[#0d5c4b]' : 'bg-gray-50 border-[#0d5c4b]'}`}>
                        <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Город</th>
                        <th className={`text-right py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Создано</th>
                        <th className={`text-right py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Незаказы</th>
                        <th className={`text-right py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Отказы</th>
                        <th className={`text-right py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>В деньги</th>
                        <th className={`text-right py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>&lt;1500</th>
                        <th className={`text-right py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>&lt;10000</th>
                        <th className={`text-right py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>10000+</th>
                        <th className={`text-right py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Макс.чек</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data.cities.map((city: any) => (
                        <tr key={city.cityId || city.city} className={`border-b transition-colors ${isDark ? 'border-gray-700 hover:bg-[#3a4451]' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <td className={`py-3 px-3 font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{city.cityName || city.city}</td>
                          <td className={`py-3 px-3 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{city.totalOrders}</td>
                          <td className={`py-3 px-3 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{city.notOrders}</td>
                          <td className={`py-3 px-3 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{city.zeroOrders}</td>
                          <td className={`py-3 px-3 text-right font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{city.completedOrders}</td>
                          <td className={`py-3 px-3 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{city.microUnder1500}</td>
                          <td className={`py-3 px-3 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{city.micro1500to10000}</td>
                          <td className={`py-3 px-3 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{city.over10kCount}</td>
                          <td className={`py-3 px-3 text-right font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(city.maxCheck)}</td>
                        </tr>
                      ))}
                      <tr className={`font-bold border-t-2 ${isDark ? 'bg-[#3a4451] border-[#0d5c4b]' : 'bg-gray-100 border-[#0d5c4b]'}`}>
                        <td className={`py-3 px-3 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>ИТОГО</td>
                        <td className={`py-3 px-3 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{reportData.data.totals.totalOrders}</td>
                        <td className={`py-3 px-3 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{reportData.data.totals.notOrders}</td>
                        <td className={`py-3 px-3 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{reportData.data.totals.zeroOrders}</td>
                        <td className={`py-3 px-3 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{reportData.data.totals.completedOrders}</td>
                        <td className={`py-3 px-3 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{reportData.data.totals.microUnder1500}</td>
                        <td className={`py-3 px-3 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{reportData.data.totals.micro1500to10000}</td>
                        <td className={`py-3 px-3 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{reportData.data.totals.over10kCount}</td>
                        <td className={`py-3 px-3 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(reportData.data.totals.maxCheck)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Таблица рекламных кампаний */}
              {reportData.type === 'campaigns' && reportData.data?.cities && (
                <div className={`rounded-lg shadow-lg overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`border-b-2 ${isDark ? 'bg-[#3a4451] border-[#0d5c4b]' : 'bg-gray-50 border-[#0d5c4b]'}`}>
                        <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Город / Тип</th>
                        <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>РК</th>
                        <th className={`text-right py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Заказов</th>
                        <th className={`text-right py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Оборот</th>
                        <th className={`text-right py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Прибыль</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data.cities.map((cityData: any) => (
                        <React.Fragment key={cityData.cityId || cityData.city}>
                          <tr className={isDark ? 'bg-[#3a4451]' : 'bg-gray-50'}>
                            <td className={`py-3 px-4 font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{cityData.cityName || cityData.city}</td>
                            <td></td>
                            <td className={`py-3 px-4 text-right font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{cityData.totals.ordersCount}</td>
                            <td className={`py-3 px-4 text-right font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(cityData.totals.revenue)}</td>
                            <td className={`py-3 px-4 text-right font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(cityData.totals.profit)}</td>
                          </tr>
                          {cityData.campaigns?.map((campaign: any, idx: number) => (
                            <tr key={`${cityData.cityId || cityData.city}-${campaign.typeName}-${idx}`} className={`border-b transition-colors ${isDark ? 'border-gray-700 hover:bg-[#3a4451]' : 'border-gray-100 hover:bg-gray-50'}`}>
                              <td className={`py-2 px-4 pl-8 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{campaign.typeName}</td>
                              <td className={`py-2 px-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{campaign.rkId || '-'}</td>
                              <td className={`py-2 px-4 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{campaign.ordersCount}</td>
                              <td className={`py-2 px-4 text-right font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(campaign.revenue)}</td>
                              <td className={`py-2 px-4 text-right font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(campaign.profit)}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                      <tr className={`font-bold border-t-2 ${isDark ? 'bg-[#3a4451] border-[#0d5c4b]' : 'bg-teal-50 border-[#0d5c4b]'}`}>
                        <td className={`py-3 px-4 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>ИТОГО</td>
                        <td></td>
                        <td className={`py-3 px-4 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{reportData.data.totals.ordersCount}</td>
                        <td className={`py-3 px-4 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(reportData.data.totals.revenue)}</td>
                        <td className={`py-3 px-4 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(reportData.data.totals.profit)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              
              {reportData.type === 'campaigns' && (!reportData.data?.cities || reportData.data.cities.length === 0) && (
                <div className={`text-center py-8 rounded-lg ${isDark ? 'bg-[#2a3441] text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                  Нет данных по рекламным кампаниям за выбранный период
                </div>
              )}

              {reportData.type !== 'campaigns' && reportData.data?.cities?.length === 0 && (
                <div className={`text-center py-8 rounded-lg ${isDark ? 'bg-[#2a3441] text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                  Нет данных за выбранный период
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
