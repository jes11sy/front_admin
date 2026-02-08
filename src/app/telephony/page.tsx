'use client'

import { PhoneCall, PhoneIncoming, PhoneOutgoing, Plus, Edit, Trash2 } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'

interface PhoneNumber {
  id: number
  phoneNumber: string
  campaign: string
  city: string
  accountName: string
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

  // Мок-данные для статистики
  const stats = {
    totalCalls: 1245,
    incomingCalls: 856,
    missedCalls: 389,
  }

  useEffect(() => {
    loadPhones()
  }, [])

  const loadPhones = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.getPhones({ search: searchQuery })
      if (response.success && response.data) {
        setPhoneNumbers(response.data)
      } else {
        toast.error('Не удалось загрузить список телефонных номеров')
      }
    } catch (error) {
      console.error('Error loading phones:', error)
      toast.error('Ошибка при загрузке телефонных номеров')
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

  // Получаем уникальные города и РК
  const uniqueCities = [...new Set(phoneNumbers.map(p => p.city).filter(Boolean))]
  const uniqueCampaigns = [...new Set(phoneNumbers.map(p => p.campaign).filter(Boolean))]

  // Фильтрация и пагинация
  const { filteredPhoneNumbers, totalPages, paginatedPhoneNumbers } = useMemo(() => {
    const filtered = phoneNumbers.filter(phone => {
      const matchesSearch = !searchQuery || 
        phone.phoneNumber.includes(searchQuery) || 
        phone.accountName?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCity = !cityFilter || phone.city === cityFilter
      const matchesCampaign = !campaignFilter || phone.campaign === campaignFilter
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
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
      <div className="px-4 py-6">
        
        {/* Статистика звонков - компактные карточки */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className={`rounded-xl p-4 ${isDark ? 'bg-[#2a3441]' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Всего</span>
              <PhoneCall className={`h-4 w-4 ${isDark ? 'text-teal-400' : 'text-teal-600'}`} />
            </div>
            <div className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{stats.totalCalls}</div>
          </div>
          
          <div className={`rounded-xl p-4 ${isDark ? 'bg-[#2a3441]' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Входящие</span>
              <PhoneIncoming className="h-4 w-4 text-green-500" />
            </div>
            <div className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{stats.incomingCalls}</div>
          </div>
          
          <div className={`rounded-xl p-4 ${isDark ? 'bg-[#2a3441]' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Пропущенные</span>
              <PhoneOutgoing className="h-4 w-4 text-red-500" />
            </div>
            <div className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{stats.missedCalls}</div>
          </div>
        </div>

        {/* Панель действий */}
        <div className="flex items-center gap-2 mb-4">
          <h1 className={`text-lg font-semibold flex-1 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
            Телефонные номера
            <span className={`ml-2 text-sm font-normal ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              ({filteredPhoneNumbers.length})
            </span>
          </h1>
          
          {/* Иконка фильтров */}
          <button
            onClick={openFiltersPanel}
            className={`relative flex-shrink-0 p-2 rounded-lg transition-all duration-200 ${
              isDark 
                ? 'bg-[#2a3441] hover:bg-[#3a4451] text-gray-400 hover:text-teal-400'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-teal-600'
            }`}
            title="Фильтры"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {(searchQuery || cityFilter || campaignFilter) && (
              <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-teal-500 rounded-full border-2 ${
                isDark ? 'border-[#1e2530]' : 'border-white'
              }`}></span>
            )}
          </button>

          {/* Кнопка добавления */}
          <button
            onClick={() => router.push('/telephony/add')}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white rounded-lg transition-all duration-200 text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Добавить</span>
          </button>
        </div>

        {/* Выезжающая панель фильтров */}
        {showFilters && (
          <>
            <div 
              className={`fixed inset-0 z-40 transition-opacity duration-300 ${isDark ? 'bg-black/50' : 'bg-black/30'}`}
              onClick={() => setShowFilters(false)}
            />
            
            <div className={`fixed top-16 md:top-0 right-0 h-[calc(100%-4rem)] md:h-full w-full sm:w-80 shadow-xl z-50 transform transition-transform duration-300 ease-out overflow-y-auto ${
              isDark ? 'bg-[#2a3441]' : 'bg-white'
            }`}>
              {/* Заголовок */}
              <div className={`hidden md:flex sticky top-0 border-b px-4 py-3 items-center justify-between z-10 ${
                isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Фильтры</h2>
                <button
                  onClick={() => setShowFilters(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-[#3a4451]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Мобильная кнопка скрыть */}
              <div className={`md:hidden sticky top-0 border-b px-4 py-3 z-10 ${
                isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <button
                  onClick={() => setShowFilters(false)}
                  className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    isDark ? 'bg-[#3a4451] hover:bg-[#4a5461] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  Скрыть фильтры
                </button>
              </div>

              {/* Содержимое */}
              <div className="p-4 space-y-4">
                {/* Поиск */}
                <div className="space-y-3">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Поиск</h3>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Номер или аккаунт</label>
                    <input
                      type="text"
                      value={draftSearchQuery}
                      onChange={(e) => setDraftSearchQuery(e.target.value)}
                      placeholder="Поиск..."
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                        isDark 
                          ? 'bg-[#3a4451] border-gray-600 text-gray-100 placeholder-gray-500'
                          : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'
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
                      <SelectTrigger className={`w-full ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                        <SelectValue placeholder="Все города" />
                      </SelectTrigger>
                      <SelectContent className={isDark ? 'bg-[#2a3441] border-gray-600' : 'bg-white border-gray-200'}>
                        <SelectItem value="all" className={isDark ? 'text-gray-100' : 'text-gray-800'}>Все города</SelectItem>
                        {uniqueCities.map(city => (
                          <SelectItem key={city} value={city} className={isDark ? 'text-gray-100' : 'text-gray-800'}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>РК</label>
                    <Select value={draftCampaignFilter || "all"} onValueChange={(v) => setDraftCampaignFilter(v === "all" ? "" : v)}>
                      <SelectTrigger className={`w-full ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                        <SelectValue placeholder="Все РК" />
                      </SelectTrigger>
                      <SelectContent className={isDark ? 'bg-[#2a3441] border-gray-600' : 'bg-white border-gray-200'}>
                        <SelectItem value="all" className={isDark ? 'text-gray-100' : 'text-gray-800'}>Все РК</SelectItem>
                        {uniqueCampaigns.map(campaign => (
                          <SelectItem key={campaign} value={campaign} className={isDark ? 'text-gray-100' : 'text-gray-800'}>{campaign}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Кнопки */}
              <div className={`sticky bottom-0 border-t px-4 py-3 flex gap-2 ${
                isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <button
                  onClick={resetFilters}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                    isDark 
                      ? 'bg-[#3a4451] hover:bg-[#4a5461] text-gray-300'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Сбросить
                </button>
                <button
                  onClick={applyFilters}
                  className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Применить
                </button>
              </div>
            </div>
          </>
        )}

        {/* Загрузка */}
        {isLoading && (
          <div className="text-center py-8 animate-fade-in">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Загрузка...</p>
          </div>
        )}

        {/* Пусто */}
        {!isLoading && filteredPhoneNumbers.length === 0 && (
          <div className={`text-center py-16 rounded-lg ${isDark ? 'bg-[#2a3441]' : 'bg-gray-50'}`}>
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
        {!isLoading && paginatedPhoneNumbers.length > 0 && (
          <div className="hidden md:block animate-fade-in">
            <div className={`rounded-lg shadow-lg overflow-hidden ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b-2 ${isDark ? 'bg-[#3a4451] border-[#0d5c4b]' : 'bg-gray-50 border-[#0d5c4b]'}`}>
                    <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Номер</th>
                    <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>РК</th>
                    <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Город</th>
                    <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Аккаунт</th>
                    <th className={`text-center py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Звонки</th>
                    <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Создан</th>
                    <th className={`text-center py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPhoneNumbers.map((phone) => (
                    <tr 
                      key={phone.id} 
                      className={`border-b transition-colors ${isDark ? 'border-gray-700 hover:bg-[#3a4451]' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                      <td className={`py-3 px-4 font-mono ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{phone.phoneNumber}</td>
                      <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{phone.campaign}</td>
                      <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{phone.city}</td>
                      <td className={`py-3 px-4 font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{phone.accountName}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${isDark ? 'bg-teal-900/50 text-teal-300' : 'bg-teal-100 text-teal-800'}`}>
                          {phone.callsCount}
                        </span>
                      </td>
                      <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{formatDate(phone.createdAt)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => router.push(`/telephony/edit/${phone.id}`)}
                            className={`p-2 rounded-lg transition-colors ${isDark ? 'text-teal-400 hover:bg-[#3a4451]' : 'text-teal-600 hover:bg-teal-50'}`}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(phone.id)}
                            className={`p-2 rounded-lg transition-colors ${isDark ? 'text-red-400 hover:bg-[#3a4451]' : 'text-red-600 hover:bg-red-50'}`}
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
        {!isLoading && paginatedPhoneNumbers.length > 0 && (
          <div className="md:hidden space-y-3 animate-fade-in">
            {paginatedPhoneNumbers.map((phone) => (
              <div 
                key={phone.id}
                className={`rounded-xl overflow-hidden border ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}
              >
                {/* Верхняя строка */}
                <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'bg-[#3a4451] border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                  <span className={`font-mono font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{phone.phoneNumber}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-teal-900/50 text-teal-300' : 'bg-teal-100 text-teal-800'}`}>
                    {phone.callsCount} звонков
                  </span>
                </div>
                
                {/* Контент */}
                <div className="px-4 py-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>РК</span>
                      <p className={isDark ? 'text-gray-200' : 'text-gray-700'}>{phone.campaign}</p>
                    </div>
                    <div>
                      <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Город</span>
                      <p className={isDark ? 'text-gray-200' : 'text-gray-700'}>{phone.city}</p>
                    </div>
                    <div className="col-span-2">
                      <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Аккаунт</span>
                      <p className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{phone.accountName}</p>
                    </div>
                  </div>
                </div>
                
                {/* Нижняя строка */}
                <div className={`flex items-center justify-between px-4 py-2 border-t ${isDark ? 'bg-[#3a4451] border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{formatDate(phone.createdAt)}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => router.push(`/telephony/edit/${phone.id}`)}
                      className={`p-2 rounded-lg transition-colors ${isDark ? 'text-teal-400 hover:bg-[#2a3441]' : 'text-teal-600 hover:bg-teal-50'}`}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(phone.id)}
                      className={`p-2 rounded-lg transition-colors ${isDark ? 'text-red-400 hover:bg-[#2a3441]' : 'text-red-600 hover:bg-red-50'}`}
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
        {!isLoading && totalPages > 1 && (
          <div className={`flex flex-col sm:flex-row items-center justify-between mt-6 gap-4 border-t pt-4 ${
            isDark ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Показано {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredPhoneNumbers.length)} из {filteredPhoneNumbers.length}
            </div>
            <OptimizedPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              isDark={isDark}
            />
          </div>
        )}
      </div>
    </div>
  )
}
