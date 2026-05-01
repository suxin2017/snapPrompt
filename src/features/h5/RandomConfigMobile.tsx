import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

import { useI18n } from '@/contexts/i18nContext'
import {
  fetchDatasetIndex,
  pickRandomAssetsByTopCategory,
  type CategoryManifestItem,
  type RandomTopCategoryPick,
} from '@/lib/promptDatasets'

export function RandomConfigMobile() {
  const { t } = useI18n()

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

  const hasResult = results.length > 0

  const sectionTitle = useMemo(() => {
    if (loadingIndex) {
      return t('randoming')
    }

    return t('randomResult')
  }, [loadingIndex, t])

  async function handleRandom() {
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
  }

  return (
    <div className="relative space-y-6 pb-36">
      <div className="relative pt-6">
        <motion.div
          animate={{ y: hasResult ? -20 : 0, scale: hasResult ? 0.72 : 1 }}
          transition={{ duration: 0.38, ease: [0.32, 0, 0.2, 1] }}
          className="flex w-full justify-center"
        >
          <motion.button
            type="button"
            onClick={handleRandom}
            whileTap={{ scale: 0.97 }}
            aria-label={t('startRandom')}
            className="flex h-40 w-40 items-center justify-center rounded-full border border-(--border) bg-[radial-gradient(circle_at_30%_20%,#fff6e7_0%,#f1dfc8_36%,#e7cfb0_100%)] p-6 text-center text-lg font-semibold text-[#1d140f] shadow-[0_12px_32px_rgba(0,0,0,0.12)] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isGenerating || loadingIndex}
          >
            <span className="inline-flex items-center gap-1">
              <Sparkles size={18} />
              {isGenerating || loadingIndex ? t('randoming') : hasResult ? t('rerandom') : t('startRandom')}
            </span>
          </motion.button>
        </motion.div>

        <AnimatePresence>
          {hasResult ? (
            <motion.section
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="mt-2 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold tracking-wide text-(--muted-foreground)">{sectionTitle}</h3>
                <span className="text-xs text-(--muted-foreground)">{results.length}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
                {results.map(({ topCategory, asset }) => (
                  <article
                    key={`${topCategory}-${asset.uuid}`}
                    className="overflow-hidden rounded-2xl border border-(--border) bg-(--background) p-2.5"
                  >
                    <div className="mb-2 inline-flex rounded-full bg-(--muted) px-2 py-1 text-[11px] font-medium text-(--muted-foreground)">
                      {topCategory}
                    </div>
                    <div className="aspect-square overflow-hidden rounded-xl bg-(--card)">
                      <img
                        src={asset.imageUrl}
                        alt={asset.title_cn}
                        loading="lazy"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <p className="mt-2 line-clamp-1 text-sm font-medium">{asset.title_cn}</p>
                  </article>
                ))}
              </div>
            </motion.section>
          ) : null}
        </AnimatePresence>

        {!hasResult && hasGenerated && !isGenerating && !loadingIndex ? (
          <p className="mt-6 text-center text-sm text-(--muted-foreground)">{t('noRandomResult')}</p>
        ) : null}

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  )
}
