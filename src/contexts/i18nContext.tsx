/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { translations } from '@/lib/translations'

type I18nContextType = {
  t: (key: keyof typeof translations.zh) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  const t = (key: keyof typeof translations.zh): string => {
    return translations.zh[key] || key
  }

  return <I18nContext.Provider value={{ t }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}
