import { useCallback, useEffect, useState } from 'react'
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
  const { setRandomPrompt, registerRandomConfigAction } = useH5Recipe()

  const [categories, setCategories] = useState<CategoryManifestItem[]>([])
  const [loadingIndex, setLoadingIndex] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [results, setResults] = useState<RandomTopCategoryPick[]>([])
  const [error, setError] = useState<string | null>(null)
  const [hasGenerated, setHasGenerated] = useState(false)

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
    setRandomPrompt(results.map((item) => item.asset.prompt_en).join(', '))
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
      const picks = await pickRandomAssetsByTopCategory(categories)
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
  }, [categories, isGenerating, loadingIndex, t])

  useEffect(() => {
    registerRandomConfigAction(() => {
      void handleRandom()
    })

    return () => {
      registerRandomConfigAction(null)
    }
  }, [handleRandom, registerRandomConfigAction])

  function removeResult(uuid: string) {
    setResults((prev) => prev.filter((r) => r.asset.uuid !== uuid))
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
                      <button
                        type="button"
                        onClick={() => removeResult(asset.uuid)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-(--border) bg-(--card) text-(--muted-foreground) transition hover:text-red-500"
                        aria-label="删除"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-(--background)">
                      <img
                        src={asset.imageUrl}
                        alt={asset.title_cn}
                        loading="lazy"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <p className="mt-3 line-clamp-1 text-sm font-medium text-(--foreground)">{asset.title_cn}</p>
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      {!hasResult && hasGenerated && !isGenerating && !loadingIndex ? (
        <div className="rounded-2xl border border-(--border) bg-(--card) p-4 text-sm text-(--muted-foreground) shadow-sm">
          {t('noRandomResult')}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-[var(--color-red-200)] bg-[var(--color-red-50)] p-4 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}
    </div>
  )
}
