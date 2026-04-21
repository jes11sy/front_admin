'use client'

import { PhoneCall, Plus, Edit, Trash2 } from 'lucide-react'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import { NetworkError } from '@/components/ui/network-error'
import { LoadingState } from '@/components/ui/loading-state'

interface PhoneNumber {
  id: number
  phoneNumber: string
  rkId: number
  rkName: string
  rkCode: string
  cityId: number
  cityName: string
  source: string | null
  callsCount: number
  createdAt: string
}

export default function TelephonyPage() {
  const router = useRouter()
  
  // Тема
  const theme = useDesignStore((state) => state.theme)
  const isDark = theme === 'dark'
  
  // Состояния
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  
  // Фильтры
  const [searchQuery, setSearchQuery] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [campaignFilter, setCampaignFilter] = useState('')
  
  // Черновики фильтров
  const [draftSearchQuery, setDraftSearchQuery] = useState('')
  const [draftCityFilter, setDraftCityFilter] = useState('')
  const [draftCampaignFilter, setDraftCampaignFilter] = useState('')
  
  // Пагинация
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    loadPhones()
  }, [])

  const loadPhones = async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const response = await apiClient.getPhones({ search: searchQuery })
      if (response.success && response.data) {
        setPhoneNumbers(response.data)
      } else {
        setLoadError('Ошибка загрузки данных')
      }
    } catch (error) {
      console.error('Error loading phones:', error)
      setLoadError('Ошибка загрузки данных')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот номер?')) {
      return
    }

    try {
      const response = await apiClient.deletePhone(id.toString())
      if (response.success) {
        toast.success('Номер успешно удален')
        loadPhones()
      } else {
        toast.error('Не удалось удалить номер')
      }
    } catch (error) {
      console.error('Error deleting phone:', error)
      toast.error('Ошибка при удалении номера')
    }
  }

  const uniqueCities = phoneNumbers.reduce((acc: Array<{ id: number; name: string }>, p) => {
    if (p.cityName && !acc.find(c => c.id === p.cityId)) {
      acc.push({ id: p.cityId, name: p.cityName })
    }
    return acc
  }, [])
  const uniqueRks = phoneNumbers.reduce((acc: Array<{ id: number; name: string }>, p) => {
    if (p.rkName && !acc.find(r => r.id === p.rkId)) {
      acc.push({ id: p.rkId, name: p.rkName })
    }
    return acc
  }, [])

  // Фильтрация и пагинация
  const { filteredPhoneNumbers, totalPages, paginatedPhoneNumbers } = useMemo(() => {
    const filtered = phoneNumbers.filter(phone => {
      const matchesSearch = !searchQuery || 
        phone.phoneNumber.includes(searchQuery) || 
        phone.source?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCity = !cityFilter || phone.cityId === Number(cityFilter)
      const matchesCampaign = !campaignFilter || phone.rkId === Number(campaignFilter)
      return matchesSearch && matchesCity && matchesCampaign
    })
    
    // Пагинация
    const pages = Math.ceil(filtered.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginated = filtered.slice(startIndex, startIndex + itemsPerPage)
    
    return { filteredPhoneNumbers: filtered, totalPages: pages, paginatedPhoneNumbers: paginated }
  }, [phoneNumbers, searchQuery, cityFilter, campaignFilter, currentPage, itemsPerPage])
  
  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, cityFilter, campaignFilter])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const selectTriggerClass = `w-full min-h-[44px] px-4 rounded-2xl text-[15px] shadow-sm outline-none ring-0 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 data-[state=open]:ring-0 data-[state=open]:ring-offset-0 dark:border-white/15 dark:focus:!border-white/30 dark:data-[state=open]:!border-white/30 ${
    isDark ? 'bg-white/[0.04] text-white data-[state=open]:border-white/20' : 'border border-[#cfd2d8] bg-white text-[#111113] shadow-[0_1px_2px_rgba(15,23,42,0.06)] focus:border-gray-300 data-[state=open]:border-[#c4c9d1]'
  }`
  const selectContentClass = `rounded-2xl border-0 shadow-xl ${isDark ? 'bg-[#1e1e20]' : 'bg-white'}`
  const selectItemClass = `rounded-xl mx-1 my-0.5 cursor-pointer ${isDark ? 'text-white focus:bg-white/10 focus:text-white' : 'text-[#111113] focus:bg-black/5 focus:text-[#111113]'}`

  // Открытие панели фильтров
  const openFiltersPanel = () => {
    setDraftSearchQuery(searchQuery)
    setDraftCityFilter(cityFilter)
    setDraftCampaignFilter(campaignFilter)
    setShowFilters(true)
  }

  // Применение фильтров
  const applyFilters = () => {
    setSearchQuery(draftSearchQuery)
    setCityFilter(draftCityFilter)
    setCampaignFilter(draftCampaignFilter)
    setShowFilters(false)
  }

  // Сброс фильтров
  const resetFilters = () => {
    setDraftSearchQuery('')
    setDraftCityFilter('')
    setDraftCampaignFilter('')
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'}`}>
      <div className="px-4 py-6">
        
        {/* Панель действий */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1" />
          
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
            {(searchQuery || cityFilter || campaignFilter) && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#b3261e] rounded-full"></span>
            )}
          </button>

          {/* Кнопка добавления */}
          <button
            onClick={() => router.push('/telephony/add')}
            disabled={isLoading}
            className={`flex items-center gap-2 min-h-[40px] px-4 rounded-2xl transition-all duration-200 text-sm font-medium ${
              isDark
                ? 'bg-white text-[#111113] hover:bg-gray-200 disabled:bg-white/40 disabled:text-[#111113]/60'
                : 'bg-[#0a4f42] text-white hover:bg-[#083f35] disabled:bg-[#0a4f42]/40'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Добавить</span>
          </button>
        </div>

        {/* Выезжающая панель фильтров */}
        <>
            <div 
              className={`fixed inset-0 z-40 transition-opacity duration-300 ${
                showFilters ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              } ${isDark ? 'bg-black/50' : 'bg-black/30 backdrop-blur-sm'}`}
              onClick={() => setShowFilters(false)}
            />
            
            <div className={`fixed top-16 md:top-4 right-0 md:right-4 h-[calc(100%-4rem)] md:h-[calc(100vh-2rem)] w-full sm:w-[360px] z-50 transform transition-all duration-300 ease-out overflow-y-auto md:rounded-[30px] ${
              showFilters ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'
            } ${
              isDark
                ? 'bg-[#111113]/92 backdrop-blur-xl border-l md:border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.35)]'
                : 'bg-white border-l md:border border-black/[0.08] shadow-[0_24px_60px_rgba(15,23,42,0.12)]'
            }`}>
              {/* Заголовок */}
              <div className={`hidden md:flex sticky top-0 border-b px-4 py-4 items-center justify-start z-10 ${
                isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'
              }`}>
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6e6e73] transition-colors hover:bg-black/[0.04] hover:text-[#111113] dark:text-white/60 dark:hover:bg-white/[0.05] dark:hover:text-white"
                >
                  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </div>

              {/* Мобильная кнопка скрыть */}
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

              {/* Содержимое */}
              <div className="p-6 space-y-8">
                {/* Поиск */}
                <div className="space-y-3">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Поиск</h3>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Номер или источник</label>
                    <input
                      type="text"
                      value={draftSearchQuery}
                      onChange={(e) => setDraftSearchQuery(e.target.value)}
                      placeholder="Поиск..."
                      className={`w-full min-h-[44px] px-4 py-2 rounded-2xl text-[15px] outline-none ring-0 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 transition-all shadow-sm ${
                        isDark 
                          ? 'bg-white/[0.04] text-white placeholder-white/30 border border-white/15 focus:border-white/30'
                          : 'border border-[#cfd2d8] bg-white text-[#111113] placeholder:text-[#8e8e93] shadow-[0_1px_2px_rgba(15,23,42,0.06)] focus:border-gray-300'
                      }`}
                    />
                  </div>
                </div>

                <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />

                {/* Фильтры */}
                <div className="space-y-3">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Фильтры</h3>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Город</label>
                    <Select value={draftCityFilter || "all"} onValueChange={(v) => setDraftCityFilter(v === "all" ? "" : v)}>
                      <SelectTrigger className={selectTriggerClass}>
                        <SelectValue placeholder="Все города" />
                      </SelectTrigger>
                      <SelectContent className={selectContentClass}>
                        <SelectItem value="all" className={selectItemClass}>Все города</SelectItem>
                        {uniqueCities.map(city => (
                          <SelectItem key={city.id} value={city.id.toString()} className={isDark ? 'text-gray-100' : 'text-gray-800'}>{city.name}</SelectItem>

                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>РК</label>
                    <Select value={draftCampaignFilter || "all"} onValueChange={(v) => setDraftCampaignFilter(v === "all" ? "" : v)}>
                      <SelectTrigger className={selectTriggerClass}>
                        <SelectValue placeholder="Все РК" />
                      </SelectTrigger>
                      <SelectContent className={isDark ? 'bg-[#2a3441] border-gray-600' : 'bg-white border-gray-200'}>
                        <SelectItem value="all" className={isDark ? 'text-gray-100' : 'text-gray-800'}>Все РК</SelectItem>
                        {uniqueRks.map(rk => (
                          <SelectItem key={rk.id} value={rk.id.toString()} className={isDark ? 'text-gray-100' : 'text-gray-800'}>{rk.name}</SelectItem>

                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Кнопки */}
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

        {/* Загрузка */}
        {isLoading && <LoadingState isDark={isDark} message="Загрузка..." />}
        
        {/* Ошибка */}
        {!isLoading && loadError && (
          <NetworkError
            isDark={isDark}
            onRetry={loadPhones}
            message={loadError}
          />
        )}

        {/* Пусто */}
        {!isLoading && !loadError && filteredPhoneNumbers.length === 0 && (
          <div className="text-center py-8 animate-fade-in">
            <PhoneCall className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
            <p className={`text-lg mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {phoneNumbers.length === 0 ? 'Нет телефонных номеров' : 'Номера не найдены'}
            </p>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {phoneNumbers.length === 0 ? 'Добавьте первый номер' : 'Попробуйте изменить фильтры'}
            </p>
          </div>
        )}

        {/* Десктопная таблица */}
        {!isLoading && !loadError && paginatedPhoneNumbers.length > 0 && (
          <div className="hidden md:block animate-fade-in">
            <div className={`rounded-[20px] shadow-lg overflow-hidden ${isDark ? 'bg-white/[0.03]' : 'bg-white'}`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b-2 ${isDark ? 'bg-white/[0.04] border-white/20' : 'bg-black/[0.02] border-black/10'}`}>
                    <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Номер</th>
                    <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Город</th>
                    <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>РК</th>
                    <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Источник</th>
                    <th className={`text-center py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Звонки</th>
                    <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Создан</th>
                    <th className={`text-center py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPhoneNumbers.map((phone) => (
                    <tr 
                      key={phone.id} 
                      className={`border-b transition-colors ${isDark ? 'border-white/10 hover:bg-white/[0.04]' : 'border-black/10 hover:bg-black/[0.02]'}`}
                    >
                      <td className={`py-3 px-4 font-mono ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{phone.phoneNumber}</td>
                      <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{phone.cityName || '-'}</td>
                      <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{phone.rkName || '-'}</td>
                      <td className={`py-3 px-4 font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{phone.source || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${isDark ? 'bg-white/[0.08] text-white' : 'bg-[#0a4f42]/10 text-[#0a4f42]'}`}>
                          {phone.callsCount}
                        </span>
                      </td>
                      <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{formatDate(phone.createdAt)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => router.push(`/telephony/edit/${phone.id}`)}
                            className={`p-2 rounded-lg transition-colors ${isDark ? 'text-white/85 hover:bg-white/[0.08]' : 'text-[#0a4f42] hover:bg-[#0a4f42]/10'}`}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(phone.id)}
                            className={`p-2 rounded-lg transition-colors ${isDark ? 'text-red-300 hover:bg-white/[0.08]' : 'text-red-600 hover:bg-red-50'}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Мобильные карточки */}
        {!isLoading && !loadError && paginatedPhoneNumbers.length > 0 && (
          <div className="md:hidden space-y-3 animate-fade-in">
            {paginatedPhoneNumbers.map((phone) => (
              <div 
                key={phone.id}
                className={`rounded-[20px] overflow-hidden border ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-black/10'}`}
              >
                {/* Верхняя строка */}
                <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                  <span className={`font-mono font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{phone.phoneNumber}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-white/[0.08] text-white' : 'bg-[#0a4f42]/10 text-[#0a4f42]'}`}>
                    {phone.callsCount} звонков
                  </span>
                </div>
                
                {/* Контент */}
                <div className="px-4 py-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Город</span>
                      <p className={isDark ? 'text-gray-200' : 'text-gray-700'}>{phone.cityName || '-'}</p>
                    </div>
                    <div>
                      <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>РК</span>
                      <p className={isDark ? 'text-gray-200' : 'text-gray-700'}>{phone.rkName || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Источник</span>
                      <p className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{phone.source || '-'}</p>
                    </div>
                  </div>
                </div>
                
                {/* Нижняя строка */}
                <div className={`flex items-center justify-between px-4 py-2 border-t ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{formatDate(phone.createdAt)}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => router.push(`/telephony/edit/${phone.id}`)}
                      className={`p-2 rounded-lg transition-colors ${isDark ? 'text-white/85 hover:bg-white/[0.08]' : 'text-[#0a4f42] hover:bg-[#0a4f42]/10'}`}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(phone.id)}
                      className={`p-2 rounded-lg transition-colors ${isDark ? 'text-red-300 hover:bg-white/[0.08]' : 'text-red-600 hover:bg-red-50'}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Пагинация */}
        {!isLoading && !loadError && totalPages > 1 && (
          <div className="mt-6 animate-fade-in">
            <OptimizedPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  )
}
