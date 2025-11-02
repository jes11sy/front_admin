'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  showFirstLast?: boolean
  showPrevNext?: boolean
  maxVisiblePages?: number
  className?: string
  disabled?: boolean
}

export function OptimizedPagination({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  showPrevNext = true,
  maxVisiblePages = 5,
  className,
  disabled = false
}: PaginationProps) {
  
  const visiblePages = useMemo(() => {
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const half = Math.floor(maxVisiblePages / 2)
    let start = Math.max(1, currentPage - half)
    const end = Math.min(totalPages, start + maxVisiblePages - 1)

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1)
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [currentPage, totalPages, maxVisiblePages])

  const showStartEllipsis = visiblePages[0] > 2
  const showEndEllipsis = visiblePages[visiblePages.length - 1] < totalPages - 1

  const handlePageClick = useCallback((page: number) => {
    if (page !== currentPage && !disabled) {
      onPageChange(page)
    }
  }, [currentPage, onPageChange, disabled])

  const handlePrevClick = useCallback(() => {
    if (currentPage > 1 && !disabled) {
      onPageChange(currentPage - 1)
    }
  }, [currentPage, onPageChange, disabled])

  const handleNextClick = useCallback(() => {
    if (currentPage < totalPages && !disabled) {
      onPageChange(currentPage + 1)
    }
  }, [currentPage, totalPages, onPageChange, disabled])

  if (totalPages <= 1) {
    return null
  }

  return (
    <div className={cn('flex items-center justify-center space-x-1', className)}>
      {/* First page button */}
      {showFirstLast && currentPage > 1 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageClick(1)}
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          1
        </Button>
      )}

      {/* Start ellipsis */}
      {showStartEllipsis && (
        <div className="flex items-center justify-center h-8 w-8">
          <MoreHorizontal className="h-4 w-4 text-gray-400" />
        </div>
      )}

      {/* Previous button */}
      {showPrevNext && (
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevClick}
          disabled={disabled || currentPage === 1}
          className="h-8 w-8 p-0 disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Page numbers */}
      {visiblePages.map((page) => (
        <Button
          key={page}
          variant={page === currentPage ? "default" : "outline"}
          size="sm"
          onClick={() => handlePageClick(page)}
          disabled={disabled}
          className={cn(
            "h-8 w-8 p-0",
            page === currentPage 
              ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:from-teal-700 hover:to-emerald-700" 
              : "bg-white"
          )}
        >
          {page}
        </Button>
      ))}

      {/* Next button */}
      {showPrevNext && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleNextClick}
          disabled={disabled || currentPage === totalPages}
          className="h-8 w-8 p-0 disabled:opacity-50"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* End ellipsis */}
      {showEndEllipsis && (
        <div className="flex items-center justify-center h-8 w-8">
          <MoreHorizontal className="h-4 w-4 text-gray-400" />
        </div>
      )}

      {/* Last page button */}
      {showFirstLast && currentPage < totalPages && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageClick(totalPages)}
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          {totalPages}
        </Button>
      )}
    </div>
  )
}

