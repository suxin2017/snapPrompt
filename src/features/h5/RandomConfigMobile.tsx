import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

import { useH5Recipe } from '@/contexts/h5RecipeContext'
import { useI18n } from '@/contexts/i18nContext'
import {
  fetchDatasetIndex,
  pickRandomAssetsByTopCategory,
  type CategoryManifestItem,
  type RandomTopCategoryPick,
} from '@/lib/promptDatasets'

export function RandomConfigMobile() {
  const { t } = useI18n()
  const {
    setRandomPrompt,
    registerRandomConfigAction,
    registerDislikedSheetAction,
    dislikedAssets,
    addDislikedAsset,
    removeDislikedAsset,
    clearDislikedAssets,
  } = useH5Recipe()

  const [categories, setCategories] = useState<CategoryManifestItem[]>([])
  const [loadingIndex, setLoadingIndex] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [results, setResults] = useState<RandomTopCategoryPick[]>([])
  const [error, setError] = useState<string | null>(null)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [showDislikedSheet, setShowDislikedSheet] = useState(false)

  const dislikedUuids = useMemo(
    () => new Set(dislikedAssets.map((asset) => asset.uuid)),
    [dislikedAssets],
  )

  useEffect(() => {
    let active = true

    fetchDatasetIndex()
      .then((index) => {
        if (!active) {
          return
        }
        setCategories(index.categories)
      })
      .catch((err) => {
        if (!active) {
          return
        }
        const message = err instanceof Error ? err.message : t('noRandomResult')
        setError(message)
      })
      .finally(() => {
        if (active) {
          setLoadingIndex(false)
        }
      })

    return () => {
      active = false
    }
  }, [t])

  useEffect(() => {
    const titleParts: string[] = []
    const seen = new Set<string>()

    for (const item of results) {
      const title = item.asset.title_cn.trim()
      if (!title || seen.has(title)) {
        continue
      }

      seen.add(title)
      titleParts.push(title)
    }

    setRandomPrompt(titleParts.join('、'))
  }, [results, setRandomPrompt])

  const hasResult = results.length > 0

  const handleRandom = useCallback(async () => {
    if (isGenerating || loadingIndex) {
      return
    }

    setIsGenerating(true)
    setError(null)
    setHasGenerated(true)

    try {
      const picks = await pickRandomAssetsByTopCategory(categories, dislikedUuids)
      setResults(picks)
      if (!picks.length) {
        setError(t('noRandomResult'))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('noRandomResult')
      setError(message)
      setResults([])
    } finally {
      setIsGenerating(false)
    }
  }, [categories, dislikedUuids, isGenerating, loadingIndex, t])

  useEffect(() => {
    registerRandomConfigAction(() => {
      void handleRandom()
    })

    return () => {
      registerRandomConfigAction(null)
    }
  }, [handleRandom, registerRandomConfigAction])

  useEffect(() => {
    registerDislikedSheetAction(() => {
      setShowDislikedSheet(true)
    })

    return () => {
      registerDislikedSheetAction(null)
    }
  }, [registerDislikedSheetAction])

  function removeResult(uuid: string) {
    setResults((prev) => prev.filter((r) => r.asset.uuid !== uuid))
  }

  function dislikeResult(topCategory: string, asset: RandomTopCategoryPick['asset']) {
    addDislikedAsset({ ...asset, category: asset.category || topCategory })
    removeResult(asset.uuid)
  }

  return (
    <div className="relative space-y-4 pb-36">
      <AnimatePresence mode="wait">
        {hasResult ? (
          <motion.section
            key="results"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="space-y-3"
          >
            <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
              <AnimatePresence initial={false}>
                {results.map(({ topCategory, asset }) => (
                  <motion.article
                    key={`${topCategory}-${asset.uuid}`}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8, transition: { duration: 0.16 } }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="overflow-hidden rounded-3xl border border-(--border) bg-(--card) p-3 shadow-sm"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="inline-flex rounded-full bg-(--muted) px-2.5 py-1 text-[11px] font-medium text-(--muted-foreground)">
                        {topCategory}
                      </div>
                    </div>
                    <div className="aspect-4/5 overflow-hidden rounded-2xl bg-(--background)">
                      <img
                        src={asset.imageUrl}
                        alt={asset.title_cn}
                        loading="lazy"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <p className="mt-3 line-clamp-1 text-sm font-medium text-(--foreground)">{asset.title_cn}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-(--border) pt-3">
                      <button
                        type="button"
                        onClick={() => removeResult(asset.uuid)}
                        className="inline-flex items-center justify-center rounded-lg border border-(--border) px-2 py-1.5 text-xs font-medium text-(--muted-foreground) transition hover:bg-(--background)"
                        aria-label={t('delete')}
                      >
                        {t('delete')}
                      </button>
                      <button
                        type="button"
                        onClick={() => dislikeResult(topCategory, asset)}
                        className="inline-flex items-center justify-center rounded-lg border border-red-200 px-2 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                        aria-label={t('dislike')}
                      >
                        {t('dislike')}
                      </button>
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      {!hasResult && hasGenerated && !isGenerating && !loadingIndex ? (
        <div className="py-10 text-center text-sm text-(--muted-foreground)">
          {t('noRandomResult')}
        </div>
      ) : null}

      {!hasResult && !hasGenerated && !isGenerating && !loadingIndex ? (
        <div className="py-10 text-center text-sm text-(--muted-foreground)">
          {t('randomEmptyHint')}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      <AnimatePresence>
        {showDislikedSheet ? (
          <motion.div
            className="fixed inset-0 z-30 bg-black/30"
            onClick={() => setShowDislikedSheet(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <motion.div
              className="absolute inset-x-0 bottom-0 max-h-[70vh] rounded-t-3xl bg-(--card) p-4"
              onClick={(event) => event.stopPropagation()}
              initial={{ y: 36, opacity: 0.6 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 26, opacity: 0.5 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t('dislikedList')}</h3>
                <button type="button" onClick={() => setShowDislikedSheet(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-y-auto">
                {dislikedAssets.length === 0 ? (
                  <p className="rounded-xl bg-(--background) p-3 text-sm text-(--muted-foreground)">
                    {t('noDislikedAssets')}
                  </p>
                ) : (
                  <motion.div layout className="space-y-2 pb-4">
                    <AnimatePresence initial={false}>
                      {dislikedAssets.map((item) => (
                        <motion.div
                          key={item.uuid}
                          layout
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 24, scale: 0.97, height: 0, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                          transition={{ duration: 0.24, ease: 'easeOut' }}
                          className="origin-top overflow-hidden flex items-center gap-3 rounded-xl border border-(--border) p-3"
                        >
                          <img
                            src={item.imageUrl}
                            alt={item.title_cn}
                            loading="lazy"
                            className="h-12 w-12 shrink-0 rounded-lg object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{item.title_cn}</p>
                            <p className="truncate text-xs text-(--muted-foreground)">{item.category}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDislikedAsset(item.uuid)}
                            className="shrink-0 rounded-md border border-(--border) px-2 py-1 text-xs transition hover:bg-(--background)"
                          >
                            {t('restore')}
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
                <button
                  type="button"
                  onClick={clearDislikedAssets}
                  disabled={dislikedAssets.length === 0}
                  className="w-full rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition enabled:hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t('restoreAll')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
