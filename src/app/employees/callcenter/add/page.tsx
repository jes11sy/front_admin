'use client'

import { RefreshCw, Upload, ArrowLeft, User, KeyRound, Phone, FileText, MessageSquare, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { useDesignStore } from '@/store/design.store'

export default function AddCallCenterEmployeePage() {
  const router = useRouter()
  
  // Тема
  const theme = useDesignStore((state) => state.theme)
  const isDark = theme === 'dark'

  const [formData, setFormData] = useState({
    name: '',
    login: '',
    password: '',
    sipAddress: '',
    note: ''
  })
  const [passportFile, setPassportFile] = useState<File | null>(null)
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const generateLogin = () => {
    if (!formData.name) return

    const translitMap: { [key: string]: string } = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
      'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    }

    const firstName = formData.name.split(' ')[0].toLowerCase()
    let translitName = ''
    for (let i = 0; i < firstName.length; i++) {
      const char = firstName[i]
      translitName += translitMap[char] || char
    }

    const randomNumbers = Math.floor(1000 + Math.random() * 9000)
    setFormData({ ...formData, login: `${translitName}_${randomNumbers}` })
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData({ ...formData, password })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      let passportDocUrl: string | undefined
      let contractDocUrl: string | undefined

      // ✅ FIX: Используем apiClient.uploadFile() вместо getAccessToken()
      // uploadFile() использует httpOnly cookies для авторизации и поддерживает 401 retry
      if (passportFile) {
        try {
          const result = await apiClient.uploadFile(passportFile, 'callcenter/passports')
          passportDocUrl = result.key
        } catch (e) {
          console.error('Failed to upload passport:', e)
        }
      }

      if (contractFile) {
        try {
          const result = await apiClient.uploadFile(contractFile, 'callcenter/contracts')
          contractDocUrl = result.key
        } catch (e) {
          console.error('Failed to upload contract:', e)
        }
      }

      const response = await apiClient.createOperator({
        name: formData.name,
        login: formData.login,
        password: formData.password,
        type: 'operator',
        sipAddress: formData.sipAddress || undefined,
        passport: passportDocUrl,
        contract: contractDocUrl,
        note: formData.note || undefined
      })

      if (response.success) {
        toast.success('Сотрудник кол-центра успешно добавлен!')
        router.push('/employees/callcenter')
      } else {
        toast.error(response.error || 'Ошибка при добавлении сотрудника')
      }
    } catch (error: any) {
      console.error('Error creating operator:', error)
      toast.error(error.message || 'Произошла ошибка при добавлении сотрудника')
    } finally {
      setIsSubmitting(false)
    }
  }

  const pageClass = isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'
  const panelClass = isDark
    ? 'bg-white/[0.04] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.35)]'
    : 'bg-white border border-black/[0.06] shadow-[0_18px_45px_rgba(15,23,42,0.08)]'
  const secondaryPanelClass = isDark
    ? 'bg-white/[0.03] border border-white/8'
    : 'bg-black/[0.02] border border-black/[0.05]'
  const inputClass = isDark
    ? 'w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 outline-none transition focus:border-white/25 focus:bg-white/[0.06]'
    : 'w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition focus:border-gray-300 focus:bg-white'
  const iconButtonClass = isDark
    ? 'flex h-[50px] w-[50px] items-center justify-center rounded-2xl border border-white/12 bg-white/[0.04] text-gray-300 transition hover:bg-white/[0.08] hover:text-white'
    : 'flex h-[50px] w-[50px] items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100 hover:text-gray-900'
  const uploadButtonClass = isDark
    ? 'flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-[24px] border border-dashed border-white/15 bg-white/[0.03] px-4 py-5 text-sm text-gray-300 transition hover:bg-white/[0.06] hover:text-white'
    : 'flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-[24px] border border-dashed border-gray-300 bg-white px-4 py-5 text-sm text-gray-600 transition hover:bg-gray-50 hover:text-gray-900'
  const labelClass = isDark ? 'mb-2 flex items-center gap-2 text-sm font-medium text-gray-300' : 'mb-2 flex items-center gap-2 text-sm font-medium text-gray-700'
  const mutedClass = isDark ? 'text-gray-400' : 'text-gray-500'
  const titleClass = isDark ? 'text-white' : 'text-[#111113]'
  const isFormReady = Boolean(formData.name && formData.login && formData.password && formData.sipAddress)

  return (
    <div className={`min-h-screen transition-colors duration-300 ${pageClass}`}>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <button
              onClick={() => router.back()}
              className={`mb-4 inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm transition ${
                isDark ? 'text-gray-400 hover:bg-white/[0.04] hover:text-white' : 'text-gray-500 hover:bg-black/[0.04] hover:text-[#111113]'
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
              Назад к списку
            </button>
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${secondaryPanelClass} ${mutedClass}`}>
              <ShieldCheck className="h-3.5 w-3.5" />
              Новый CRM / Call Center
            </div>
            <h1 className={`mt-3 text-3xl font-semibold tracking-tight ${titleClass}`}>Добавить оператора</h1>
            <p className={`mt-2 max-w-2xl text-sm leading-6 ${mutedClass}`}>
              Создай нового сотрудника кол-центра, задай доступы и сразу прикрепи документы. Форма оформлена в новом стиле CRM, чтобы быстрее считывать ключевые поля.
            </p>
          </div>

          <div className={`rounded-[28px] px-5 py-4 ${panelClass}`}>
            <div className={`text-xs uppercase tracking-[0.18em] ${mutedClass}`}>Статус формы</div>
            <div className={`mt-2 text-sm font-medium ${titleClass}`}>
              {isSubmitting ? 'Создаём сотрудника...' : isFormReady ? 'Готово к сохранению' : 'Заполни обязательные поля'}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <section className={`rounded-[32px] p-6 sm:p-7 ${panelClass}`}>
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className={`text-lg font-semibold ${titleClass}`}>Основная информация</h2>
                  <p className={`mt-1 text-sm ${mutedClass}`}>
                    Базовые данные для входа в систему и телефонии.
                  </p>
                </div>
                <div className={`hidden rounded-2xl px-3 py-2 text-xs font-medium sm:block ${secondaryPanelClass} ${mutedClass}`}>
                  4 обязательных поля
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className={labelClass}>
                    <User className="h-4 w-4" />
                    Имя <span className="text-[#b3261e]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Введите полное имя сотрудника"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    <User className="h-4 w-4" />
                    Логин <span className="text-[#b3261e]">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={formData.login}
                      onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                      placeholder="Введите логин"
                      className={inputClass}
                    />
                    <button type="button" onClick={generateLogin} className={iconButtonClass} title="Сгенерировать логин">
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    <KeyRound className="h-4 w-4" />
                    Пароль <span className="text-[#b3261e]">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Введите пароль"
                      className={inputClass}
                    />
                    <button type="button" onClick={generatePassword} className={iconButtonClass} title="Сгенерировать пароль">
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>
                    <Phone className="h-4 w-4" />
                    SIP адрес <span className="text-[#b3261e]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sipAddress}
                    onChange={(e) => setFormData({ ...formData, sipAddress: e.target.value })}
                    placeholder="Например: 100"
                    className={inputClass}
                  />
                </div>
              </div>
            </section>

            <section className={`rounded-[32px] p-6 sm:p-7 ${panelClass}`}>
              <div className="mb-6">
                <h2 className={`text-lg font-semibold ${titleClass}`}>Документы</h2>
                <p className={`mt-1 text-sm ${mutedClass}`}>
                  Можно прикрепить сканы сразу при создании сотрудника или добавить позже.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className={labelClass}>
                    <FileText className="h-4 w-4" />
                    Фото паспорта
                  </div>
                  <button
                    type="button"
                    onClick={() => document.getElementById('passport')?.click()}
                    className={uploadButtonClass}
                  >
                    <Upload className="h-5 w-5" />
                    <span className="font-medium">{passportFile ? passportFile.name : 'Загрузить файл'}</span>
                    <span className={`text-xs ${mutedClass}`}>PNG, JPG или другой image-файл</span>
                  </button>
                  <input
                    id="passport"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setPassportFile(e.target.files?.[0] || null)}
                  />
                </div>

                <div>
                  <div className={labelClass}>
                    <FileText className="h-4 w-4" />
                    Фото договора
                  </div>
                  <button
                    type="button"
                    onClick={() => document.getElementById('contract')?.click()}
                    className={uploadButtonClass}
                  >
                    <Upload className="h-5 w-5" />
                    <span className="font-medium">{contractFile ? contractFile.name : 'Загрузить файл'}</span>
                    <span className={`text-xs ${mutedClass}`}>Прикрепи договор, если он уже готов</span>
                  </button>
                  <input
                    id="contract"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>
            </section>

            <section className={`rounded-[32px] p-6 sm:p-7 ${panelClass}`}>
              <div className="mb-4">
                <h2 className={`text-lg font-semibold ${titleClass}`}>Комментарий</h2>
                <p className={`mt-1 text-sm ${mutedClass}`}>
                  Внутренняя заметка для администраторов и руководителей.
                </p>
              </div>

              <label className={labelClass}>
                <MessageSquare className="h-4 w-4" />
                Заметка
              </label>
              <textarea
                rows={5}
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Например: смена, особенности телефонии, комментарий по доступам"
                className={`${inputClass} min-h-[132px] resize-none`}
              />
            </section>

            <div className={`flex flex-col gap-3 rounded-[28px] p-4 sm:flex-row sm:items-center sm:justify-between ${panelClass}`}>
              <div className={`text-sm ${mutedClass}`}>
                После сохранения сотрудник появится в списке кол-центра и сможет войти под новым логином.
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => router.push('/employees/callcenter')}
                  disabled={isSubmitting}
                  className={`rounded-2xl px-5 py-3 text-sm font-medium transition ${
                    isDark
                      ? 'bg-white/[0.04] text-gray-300 hover:bg-white/[0.08] hover:text-white disabled:opacity-50'
                      : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50'
                  }`}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`rounded-2xl px-6 py-3 text-sm font-semibold text-white transition ${
                    isSubmitting
                      ? 'bg-[#0a4f42]/60'
                      : 'bg-[#0a4f42] hover:bg-[#083f35]'
                  }`}
                >
                  {isSubmitting ? 'Добавление...' : 'Добавить сотрудника'}
                </button>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <section className={`rounded-[32px] p-6 ${panelClass} xl:sticky xl:top-6`}>
              <h2 className={`text-lg font-semibold ${titleClass}`}>Краткая сводка</h2>
              <div className="mt-5 space-y-4">
                <div className={`rounded-2xl p-4 ${secondaryPanelClass}`}>
                  <div className={`text-xs uppercase tracking-[0.16em] ${mutedClass}`}>Сотрудник</div>
                  <div className={`mt-2 text-sm font-medium ${titleClass}`}>{formData.name || 'Не указано'}</div>
                </div>
                <div className={`rounded-2xl p-4 ${secondaryPanelClass}`}>
                  <div className={`text-xs uppercase tracking-[0.16em] ${mutedClass}`}>Логин</div>
                  <div className={`mt-2 break-all text-sm font-medium ${titleClass}`}>{formData.login || 'Не задан'}</div>
                </div>
                <div className={`rounded-2xl p-4 ${secondaryPanelClass}`}>
                  <div className={`text-xs uppercase tracking-[0.16em] ${mutedClass}`}>SIP</div>
                  <div className={`mt-2 text-sm font-medium ${titleClass}`}>{formData.sipAddress || 'Не назначен'}</div>
                </div>
              </div>

              <div className={`mt-6 rounded-[24px] p-4 ${secondaryPanelClass}`}>
                <div className={`text-sm font-medium ${titleClass}`}>Что важно заполнить</div>
                <ul className={`mt-3 space-y-2 text-sm ${mutedClass}`}>
                  <li>Имя, логин и пароль нужны для первого входа.</li>
                  <li>SIP адрес используется в телефонии и должен совпадать с настройками.</li>
                  <li>Документы можно прикрепить сразу или загрузить позже в карточке сотрудника.</li>
                </ul>
              </div>
            </section>
          </aside>
        </form>
      </div>
    </div>
  )
}
