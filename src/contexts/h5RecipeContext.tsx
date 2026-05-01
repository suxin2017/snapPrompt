/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

import type { PromptAssetItem } from '@/lib/promptDatasets'

export type RecipeItem = PromptAssetItem & { key: string }

const DISLIKED_ASSETS_KEY = 'snapprompt_random_disliked_assets'

function loadDislikedAssets() {
  if (typeof window === 'undefined') {
    return [] as PromptAssetItem[]
  }

  try {
    const raw = localStorage.getItem(DISLIKED_ASSETS_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(
      (item): item is PromptAssetItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.uuid === 'string' &&
        typeof item.filename === 'string' &&
        typeof item.title_cn === 'string' &&
        typeof item.prompt_en === 'string' &&
        typeof item.image === 'string' &&
        typeof item.imageUrl === 'string' &&
        typeof item.category === 'string' &&
        typeof item.datasetName === 'string' &&
        typeof item.datasetId === 'string',
    )
  } catch {
    return []
  }
}

type H5RecipeContextValue = {
  subject: string
  setSubject: (value: string) => void
  recipeItems: RecipeItem[]
  addRecipeItem: (asset: PromptAssetItem) => void
  removeRecipeItem: (keyOrUuid: string) => void
  dislikedAssets: PromptAssetItem[]
  addDislikedAsset: (asset: PromptAssetItem) => void
  removeDislikedAsset: (uuid: string) => void
  clearDislikedAssets: () => void
  randomPrompt: string
  setRandomPrompt: (value: string) => void
  requestRandomConfig: () => void
  registerRandomConfigAction: (action: (() => void) | null) => void
  requestDislikedSheet: () => void
  registerDislikedSheetAction: (action: (() => void) | null) => void
}

const H5RecipeContext = createContext<H5RecipeContextValue | null>(null)

export function H5RecipeProvider({ children }: { children: ReactNode }) {
  const [subject, setSubject] = useState('')
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([])
  const [dislikedAssets, setDislikedAssets] = useState<PromptAssetItem[]>(() => loadDislikedAssets())
  const [randomPrompt, setRandomPrompt] = useState('')
  const randomConfigActionRef = useRef<(() => void) | null>(null)
  const dislikedSheetActionRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      localStorage.setItem(DISLIKED_ASSETS_KEY, JSON.stringify(dislikedAssets))
    } catch {
      // Ignore persistence failures to keep random flow available.
    }
  }, [dislikedAssets])

  function addRecipeItem(asset: PromptAssetItem) {
    setRecipeItems((prev) => [...prev, { ...asset, key: `${asset.uuid}-${Date.now()}-${prev.length}` }])
  }

  function removeRecipeItem(keyOrUuid: string) {
    setRecipeItems((prev) => prev.filter((item) => item.key !== keyOrUuid && item.uuid !== keyOrUuid))
  }

  function addDislikedAsset(asset: PromptAssetItem) {
    setDislikedAssets((prev) => {
      if (prev.some((item) => item.uuid === asset.uuid)) {
        return prev
      }

      return [asset, ...prev]
    })
  }

  function removeDislikedAsset(uuid: string) {
    setDislikedAssets((prev) => prev.filter((item) => item.uuid !== uuid))
  }

  function clearDislikedAssets() {
    setDislikedAssets([])
  }

  function requestRandomConfig() {
    randomConfigActionRef.current?.()
  }

  function registerRandomConfigAction(action: (() => void) | null) {
    randomConfigActionRef.current = action
  }

  function requestDislikedSheet() {
    dislikedSheetActionRef.current?.()
  }

  function registerDislikedSheetAction(action: (() => void) | null) {
    dislikedSheetActionRef.current = action
  }

  return (
    <H5RecipeContext.Provider
      value={{
        subject,
        setSubject,
        recipeItems,
        addRecipeItem,
        removeRecipeItem,
        dislikedAssets,
        addDislikedAsset,
        removeDislikedAsset,
        clearDislikedAssets,
        randomPrompt,
        setRandomPrompt,
        requestRandomConfig,
        registerRandomConfigAction,
        requestDislikedSheet,
        registerDislikedSheetAction,
      }}
    >
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
