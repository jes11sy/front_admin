'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { useDesignStore } from '@/store/design.store'
import { useOrder, useOrderCalls, Order, Master } from '@/hooks/useOrder'
import { useMultipleFileUpload } from '@/hooks/useMultipleFileUpload'
import CustomSelect from '@/components/optimized/CustomSelect'
import { StatusSelect } from '@/components/orders/StatusSelect'
import { OrderMasterTab } from '@/components/orders/OrderMasterTab'
import { OrderMultipleFileUpload } from '@/components/orders/OrderMultipleFileUpload'
import { OrderCallsTab } from '@/components/orders/OrderCallsTab'

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string
  
  // Тема из store
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'
  
  // Используем хуки для загрузки данных
  const { order, masters, loading, error, updating, updateOrder } = useOrder(orderId)
  const { calls, loading: callsLoading, error: callsError, loadCalls } = useOrderCalls(orderId)
  
  const [activeTab, setActiveTab] = useState('main')
  const [openSelect, setOpenSelect] = useState<string | null>(null)
  const [callsLoaded, setCallsLoaded] = useState(false)
  
  // Локальные состояния для полей формы
  const [orderStatus, setOrderStatus] = useState('')
  const [selectedMaster, setSelectedMaster] = useState('')
  
  // Состояние для полей формы
  const [result, setResult] = useState<string>('')
  const [expenditure, setExpenditure] = useState<string>('')
  const [clean, setClean] = useState<string>('')
  const [masterChange, setMasterChange] = useState<string>('')
  const [comment, setComment] = useState<string>('')
  const [prepayment, setPrepayment] = useState<string>('')
  const [dateClosmod, setDateClosmod] = useState<string>('')
  
  // Файлы документов через хуки (множественная загрузка до 10 файлов)
  const bsoUpload = useMultipleFileUpload(10)
  const expenditureUpload = useMultipleFileUpload(10)

  const tabs = [
    { id: 'main', label: 'Информация' },
    { id: 'result', label: 'Мастер' },
    { id: 'chat', label: 'История' }
  ]

  // Админ может редактировать ВСЕ заказы - никаких ограничений
  const isFieldsDisabled = (): boolean => {
    return false // Админ может редактировать всё
  }

  // Функция для проверки, нужно ли скрывать поля итога, расхода, документа и чека
  const shouldHideFinancialFields = () => {
    return ['Ожидает', 'Принял', 'В пути'].includes(orderStatus)
  }

  // Автоматически рассчитываем "Чистыми" и "Сдача мастера" при изменении "Итог" и "Расход"
  useEffect(() => {
    if (result && orderStatus === 'Готово') {
      const resultAmount = Number(result)
      const expenditureAmount = expenditure ? Number(expenditure) : 0
      
      if (resultAmount > 0) {
        const cleanAmount = resultAmount - expenditureAmount
        const masterPercent = resultAmount <= 5000 ? 0.6 : 0.5
        const masterChangeAmount = cleanAmount * masterPercent
        
        setClean(cleanAmount.toString())
        setMasterChange(masterChangeAmount.toString())
      }
    }
  }, [result, expenditure, orderStatus])

  // Админ может менять ВСЕ статусы без ограничений
  const getAvailableStatuses = () => {
    return ['Ожидает', 'Принял', 'В пути', 'В работе', 'Готово', 'Отказ', 'Модерн', 'Незаказ']
  }

  // Синхронизация данных заказа с локальными состояниями формы
  useEffect(() => {
    if (order) {
      const loadDocuments = async () => {
      setOrderStatus(order.status?.name || '')
      setResult(order.result?.toString() || '')
      setExpenditure(order.expenditure?.toString() || '')
      setClean(order.clean?.toString() || '')
      setMasterChange(order.masterChange?.toString() || '')
      setComment(order.comment || '')
      setPrepayment(order.prepayment?.toString() || '')
      try {
        const closeMod = order.dateCloseMod || order.dateClosmod
        setDateClosmod(closeMod ? new Date(closeMod).toISOString().split('T')[0] : '')
        } catch {
          setDateClosmod('')
        }
        
        // Строим прямые URL для существующих файлов в S3
        const S3_BASE_URL = 'https://s3.twcstorage.ru/f7eead03-crmfiles'
        
        if (order.bsoDoc && Array.isArray(order.bsoDoc)) {
          const bsoUrls = order.bsoDoc
            .filter((doc: string | null): doc is string => !!doc && typeof doc === 'string' && doc.trim() !== '')
            .map((doc: string) => doc.startsWith('http') ? doc : `${S3_BASE_URL}/${doc}`)
          if (bsoUrls.length > 0) {
            bsoUpload.setExistingPreviews(bsoUrls)
          }
        }
        if (order.expenditureDoc && Array.isArray(order.expenditureDoc)) {
          const expenditureUrls = order.expenditureDoc
            .filter((doc: string | null): doc is string => !!doc && typeof doc === 'string' && doc.trim() !== '')
            .map((doc: string) => doc.startsWith('http') ? doc : `${S3_BASE_URL}/${doc}`)
          if (expenditureUrls.length > 0) {
            expenditureUpload.setExistingPreviews(expenditureUrls)
          }
        }
        
        // Устанавливаем выбранного мастера
        if (order.masterId) {
          setSelectedMaster(order.masterId.toString())
        }
      }
      
      loadDocuments()
    }
  }, [order])

  // Очистка превью при размонтировании
  useEffect(() => {
    return () => {
      bsoUpload.cleanup()
      expenditureUpload.cleanup()
    }
  }, [bsoUpload, expenditureUpload])

  // Загружаем звонки при открытии таба "История"
  useEffect(() => {
    if (activeTab === 'chat' && !callsLoading && !callsLoaded) {
      setCallsLoaded(true)
      loadCalls().catch((error) => {
        logger.warn('Calls API not available:', error.message)
      })
    }
  }, [activeTab, callsLoading, callsLoaded, loadCalls])

  // Функция для сохранения изменений
  const handleSave = async () => {
    if (!order) return
    
    try {
      // Загружаем файлы в S3 если они есть
      let bsoDocPaths: string[] = []
      let expenditureDocPaths: string[] = []

      // Загружаем новые BSO файлы
      const newBsoFiles = bsoUpload.files.filter(f => f.file !== null).map(f => f.file);
      if (newBsoFiles.length > 0) {
        try {
          const bsoResults = await Promise.all(
            newBsoFiles.map(file => apiClient.uploadOrderBso(file))
          )
          const newBsoPaths = bsoResults.map((res: any) => res.filePath)
          
          const existingBsoPaths = bsoUpload.files
            .filter(f => f.file === null)
            .map(f => f.preview)
          
          bsoDocPaths = [...existingBsoPaths, ...newBsoPaths]
        } catch (uploadError) {
          logger.error('Error uploading BSO', uploadError)
          toast.error('Ошибка загрузки документа БСО')
          return
        }
      } else {
        bsoDocPaths = bsoUpload.files
          .filter(f => f.file === null)
          .map(f => f.preview)
      }

      // Загружаем новые файлы расходов
      const newExpenditureFiles = expenditureUpload.files.filter(f => f.file !== null).map(f => f.file);
      if (newExpenditureFiles.length > 0) {
        try {
          const expenditureResults = await Promise.all(
            newExpenditureFiles.map(file => apiClient.uploadOrderExpenditure(file))
          )
          const newExpenditurePaths = expenditureResults.map((res: any) => res.filePath)
          
          const existingExpenditurePaths = expenditureUpload.files
            .filter(f => f.file === null)
            .map(f => f.preview)
          
          expenditureDocPaths = [...existingExpenditurePaths, ...newExpenditurePaths]
        } catch (uploadError) {
          logger.error('Error uploading expenditure doc', uploadError)
          toast.error('Ошибка загрузки чека расхода')
          return
        }
      } else {
        expenditureDocPaths = expenditureUpload.files
          .filter(f => f.file === null)
          .map(f => f.preview)
      }
      
      const updateData: any = {
        status: orderStatus,
        masterId: selectedMaster ? Number(selectedMaster) : undefined,
        result: result && result.trim() !== '' ? Number(result) : undefined,
        expenditure: expenditure && expenditure.trim() !== '' ? Number(expenditure) : undefined,
        clean: clean && clean.trim() !== '' ? Number(clean) : undefined,
        masterChange: masterChange && masterChange.trim() !== '' ? Number(masterChange) : undefined,
        comment: comment && comment.trim() !== '' ? comment : undefined,
        prepayment: prepayment && prepayment.trim() !== '' ? Number(prepayment) : undefined,
        dateCloseMod: dateClosmod && dateClosmod.trim() !== '' ? (() => {
          try {
            return new Date(dateClosmod).toISOString()
          } catch {
            return undefined
          }
        })() : undefined,
        bsoDoc: bsoDocPaths,
        expenditureDoc: expenditureDocPaths,
      }
      
      await updateOrder(updateData)
      
      // Перезагружаем страницу после сохранения
      window.location.reload()
    } catch (err) {
      logger.error('Error saving order', err)
    }
  }

  // Форматирование даты
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return '-'
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC'
      })
    } catch {
      return '-'
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 min-h-screen ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Загрузка заказа...</span>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className={`min-h-screen p-4 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
        <div className={`rounded-xl p-4 ${isDark ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
          <p className={isDark ? 'text-red-400 text-sm' : 'text-red-600 text-sm'}>{error instanceof Error ? error.message : error || 'Заказ не найден'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 min-h-screen -m-4 sm:-m-6 p-4 sm:p-6 transition-colors duration-300 ${
      isDark ? 'bg-[#1e2530]' : 'bg-white'
    }`}>
      {/* Шапка заказа */}
      <div className={`rounded-b-xl shadow-sm ${isDark ? 'bg-[#2a3441]' : 'bg-gray-50'}`}>
        <div className={`flex items-center justify-between px-4 py-3 border-b relative ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark ? 'hover:bg-[#3a4451]' : 'hover:bg-gray-100'
              }`}
            >
              <svg className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Заказ #{orderId}</h1>
            <StatusSelect
              value={orderStatus}
              onChange={setOrderStatus}
              options={getAvailableStatuses().map(status => ({ value: status, label: status }))}
              disabled={false}
              selectId="orderStatus"
              openSelect={openSelect}
              setOpenSelect={setOpenSelect}
            />
          </div>
          <button 
            onClick={handleSave}
            disabled={updating}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Сохранение...</span>
              </>
            ) : 'Сохранить'}
          </button>
        </div>

        {/* Компактные табы */}
        <div className={`flex border-b ${
          isDark ? 'border-gray-700 bg-[#3a4451]/50' : 'border-gray-200 bg-gray-100/50'
        }`}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-teal-500'
                  : isDark 
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Содержимое вкладок */}
      {!loading && !error && order && (
        <>
          {activeTab === 'main' && (
            <div className="space-y-4">
              {/* Блок: Заказ */}
              <div className={`rounded-xl shadow-sm ${isDark ? 'bg-[#2a3441]' : 'bg-white border border-gray-200'}`}>
                <div className={`px-4 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <h3 className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Заказ</h3>
                </div>
                <div className={`grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                  <div className="p-4">
                    <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Тип</div>
                    <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.typeOrder || '-'}</div>
                  </div>
                  <div className="p-4">
                    <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>РК</div>
                    <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.rk?.name || '-'}</div>
                  </div>
                  <div className="p-4">
                    <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Направление</div>
                    <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.equipmentType?.name || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Блок: Клиент */}
              <div className={`rounded-xl shadow-sm ${isDark ? 'bg-[#2a3441]' : 'bg-white border border-gray-200'}`}>
                <div className={`px-4 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <h3 className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Клиент</h3>
                </div>
                <div className={`grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                  <div className="p-4">
                    <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Город</div>
                    <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.city?.name || '-'}</div>
                  </div>
                  <div className="p-4">
                    <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Адрес</div>
                    <div className={`text-sm font-medium truncate ${isDark ? 'text-gray-100' : 'text-gray-800'}`} title={order.address}>{order.address || '-'}</div>
                  </div>
                  <div className="p-4">
                    <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Имя</div>
                    <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.clientName || '-'}</div>
                  </div>
                  <div className="p-4">
                    <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Телефон</div>
                    <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.phone || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Блок: Детали */}
              <div className={`rounded-xl shadow-sm ${isDark ? 'bg-[#2a3441]' : 'bg-white border border-gray-200'}`}>
                <div className={`px-4 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <h3 className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Детали</h3>
                </div>
                <div className={`grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                  <div className="p-4">
                    <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Дата встречи</div>
                    <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                      {formatDate(order.dateMeeting)}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Мастер</div>
                    <div className={`text-sm ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.master?.name || '-'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'result' && (
            <div className="space-y-4">
              <OrderMasterTab
                orderStatus={orderStatus}
                selectedMaster={selectedMaster}
                setSelectedMaster={setSelectedMaster}
                masters={masters}
                result={result}
                setResult={setResult}
                expenditure={expenditure}
                setExpenditure={setExpenditure}
                clean={clean}
                setClean={setClean}
                masterChange={masterChange}
                setMasterChange={setMasterChange}
                comment={comment}
                setComment={setComment}
                prepayment={prepayment}
                setPrepayment={setPrepayment}
                dateClosmod={dateClosmod}
                setDateClosmod={setDateClosmod}
                isFieldsDisabled={isFieldsDisabled}
                shouldHideFinancialFields={shouldHideFinancialFields}
                openSelect={openSelect}
                setOpenSelect={setOpenSelect}
              />
              
              {/* Поля "Документ" и "Чек" - множественная загрузка */}
              {!shouldHideFinancialFields() && orderStatus !== 'Модерн' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <OrderMultipleFileUpload
                    label="Документ БСО"
                    filesWithPreviews={bsoUpload.files}
                    dragOver={bsoUpload.dragOver}
                    setDragOver={bsoUpload.setDragOver}
                    handleFiles={bsoUpload.handleFiles}
                    removeFile={bsoUpload.removeFile}
                    isFieldsDisabled={isFieldsDisabled}
                    canAddMore={bsoUpload.canAddMore}
                  />
                  <OrderMultipleFileUpload
                    label="Чеки расходов"
                    filesWithPreviews={expenditureUpload.files}
                    dragOver={expenditureUpload.dragOver}
                    setDragOver={expenditureUpload.setDragOver}
                    handleFiles={expenditureUpload.handleFiles}
                    removeFile={expenditureUpload.removeFile}
                    isFieldsDisabled={isFieldsDisabled}
                    canAddMore={expenditureUpload.canAddMore}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'chat' && (
            <OrderCallsTab
              order={order}
              calls={calls}
              callsLoading={callsLoading}
              callsError={callsError ? (callsError instanceof Error ? callsError.message : String(callsError)) : null}
            />
          )}
        </>
      )}
      
      {/* Кнопка Сохранить для мобильных */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 z-50">
        <button 
          onClick={handleSave}
          disabled={updating}
          className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updating ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}
