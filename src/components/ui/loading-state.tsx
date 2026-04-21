import React from 'react'

interface LoadingStateProps {
  isDark: boolean
  message?: string
}

export function LoadingState({
  isDark,
  message = 'Загрузка...'
}: LoadingStateProps) {
  return (
    <div className="text-center py-8 animate-fade-in">
      <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${isDark ? 'border-white' : 'border-[#0a4f42]'}`} />
      <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{message}</p>
    </div>
  )
}
