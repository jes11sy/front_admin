'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ReferencesPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/references/cities')
  }, [router])

  return null
}
