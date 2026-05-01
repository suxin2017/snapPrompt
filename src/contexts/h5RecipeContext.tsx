/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useRef, useState, type ReactNode } from 'react'

import type { PromptAssetItem } from '@/lib/promptDatasets'

export type RecipeItem = PromptAssetItem & { key: string }

type H5RecipeContextValue = {
  subject: string
  setSubject: (value: string) => void
  recipeItems: RecipeItem[]
  addRecipeItem: (asset: PromptAssetItem) => void
  removeRecipeItem: (keyOrUuid: string) => void
  randomPrompt: string
  setRandomPrompt: (value: string) => void
  requestRandomConfig: () => void
  registerRandomConfigAction: (action: (() => void) | null) => void
}

const H5RecipeContext = createContext<H5RecipeContextValue | null>(null)

export function H5RecipeProvider({ children }: { children: ReactNode }) {
  const [subject, setSubject] = useState('')
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([])
  const [randomPrompt, setRandomPrompt] = useState('')
  const randomConfigActionRef = useRef<(() => void) | null>(null)

  function addRecipeItem(asset: PromptAssetItem) {
    setRecipeItems((prev) => [...prev, { ...asset, key: `${asset.uuid}-${Date.now()}-${prev.length}` }])
  }

  function removeRecipeItem(keyOrUuid: string) {
    setRecipeItems((prev) => prev.filter((item) => item.key !== keyOrUuid && item.uuid !== keyOrUuid))
  }

  function requestRandomConfig() {
    randomConfigActionRef.current?.()
  }

  function registerRandomConfigAction(action: (() => void) | null) {
    randomConfigActionRef.current = action
  }

  return (
    <H5RecipeContext.Provider value={{ subject, setSubject, recipeItems, addRecipeItem, removeRecipeItem, randomPrompt, setRandomPrompt, requestRandomConfig, registerRandomConfigAction }}>
      {children}
    </H5RecipeContext.Provider>
  )
}

export function useH5Recipe() {
  const ctx = useContext(H5RecipeContext)
  if (!ctx) {
    throw new Error('useH5Recipe must be used within H5RecipeProvider')
  }

  return ctx
}
