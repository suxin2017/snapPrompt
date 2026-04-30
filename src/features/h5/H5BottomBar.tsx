import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Layers, Sparkles, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { useH5Recipe } from '@/contexts/h5RecipeContext'
import { useI18n } from '@/contexts/i18nContext'

function preventImageDefault(e: React.SyntheticEvent) {
  e.preventDefault()
}

function buildPrompt(subject: string, items: { prompt_en: string; title_cn: string }[]) {
  const parts: string[] = []
  if (subject.trim()) {
    parts.push(subject.trim())
  }

  for (const item of items) {
    parts.push(item.title_cn)
  }

  return parts.join('、')
}

export function H5BottomBar() {
  const { subject, recipeItems, removeRecipeItem } = useH5Recipe()
  const navigate = useNavigate()
  const { t } = useI18n()

  const [showRecipeSheet, setShowRecipeSheet] = useState(false)
  const [showPromptSheet, setShowPromptSheet] = useState(false)
  const [copied, setCopied] = useState(false)
  const [flashRecipeKey, setFlashRecipeKey] = useState<string | null>(null)
  const prevRecipeKeysRef = useRef<string[]>([])

  const promptOutput = useMemo(() => buildPrompt(subject, recipeItems), [subject, recipeItems])

  const keywords = useMemo(() => recipeItems.map((item) => item.title_cn), [recipeItems])

  useEffect(() => {
    const prevKeys = new Set(prevRecipeKeysRef.current)
    const added = recipeItems.find((item) => !prevKeys.has(item.key))
    prevRecipeKeysRef.current = recipeItems.map((item) => item.key)
    if (!added) return

    setFlashRecipeKey(added.key)
    const timer = window.setTimeout(() => {
      setFlashRecipeKey((current) => (current === added.key ? null : current))
    }, 520)

    return () => window.clearTimeout(timer)
  }, [recipeItems])

  async function handleCopy() {
    if (!promptOutput) {
      return
    }

    try {
      await navigator.clipboard.writeText(promptOutput)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard may be unavailable in some browsers */
    }
  }

  function handleGenerateClick() {
    if (!recipeItems.length) {
      void navigate('/m/cut-tool')
      return
    }

    setShowPromptSheet(true)
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-6xl px-4 pb-2">
        <div className="rounded-2xl border border-(--border) bg-(--card)/95 p-3 shadow-lg md:backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowRecipeSheet(true)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <Layers size={16} className="shrink-0 text-[var(--primary)]" />
              <div className="min-w-0">
                <span className="text-sm font-medium">
                  {t('currentRecipe')}{' '}
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={recipeItems.length}
                      initial={{ opacity: 0, y: 6, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.9 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="inline-block"
                    >
                      {recipeItems.length}
                    </motion.span>
                  </AnimatePresence>{' '}
                  {t('categories')}
                </span>
              </div>
            </button>
            <Button size="sm" variant="secondary" onClick={() => setShowRecipeSheet(true)} disabled={!recipeItems.length}>
              {t('view')}
            </Button>
            <Button size="sm" onClick={handleGenerateClick} className="gap-1.5">
              <Sparkles size={14} />
              {recipeItems.length ? t('generate') : t('selectBlocksBtn')}
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showRecipeSheet ? (
          <motion.div
            className="fixed inset-0 z-30 bg-black/30"
            onClick={() => setShowRecipeSheet(false)}
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
                <h3 className="text-lg font-semibold">{t('recipe')}</h3>
                <button type="button" onClick={() => setShowRecipeSheet(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-y-auto">
                {recipeItems.length === 0 ? (
                  <p className="rounded-xl bg-(--background) p-3 text-sm text-(--muted-foreground)">
                    {t('noRecipe')}
                  </p>
                ) : (
                  <motion.div layout className="space-y-2 pb-4">
                    <AnimatePresence initial={false}>
                      {recipeItems.map((item) => (
                        <motion.div
                          key={item.key}
                          layout
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={
                            flashRecipeKey === item.key
                              ? { opacity: 1, y: 0, scale: [1, 1.015, 1], backgroundColor: ['rgba(0,95,115,0.12)', 'rgba(0,95,115,0)'] }
                              : { opacity: 1, y: 0, scale: 1, backgroundColor: 'rgba(0,95,115,0)' }
                          }
                          exit={{ opacity: 0, x: 24, scale: 0.97, height: 0, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                          transition={{ duration: 0.24, ease: 'easeOut' }}
                          className="origin-top overflow-hidden flex items-center gap-3 rounded-xl border border-(--border) p-3"
                        >
                          <img
                            src={item.imageUrl}
                            alt={item.title_cn}
                            draggable={false}
                            onContextMenu={preventImageDefault}
                            onDragStart={preventImageDefault}
                            className="h-12 w-12 shrink-0 rounded-lg object-cover select-none"
                            style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{item.title_cn}</p>
                            <p className="truncate text-xs text-(--muted-foreground)">{item.prompt_en}</p>
                          </div>
                          <motion.button
                            type="button"
                            onClick={() => removeRecipeItem(item.key)}
                            whileTap={{ scale: 0.9 }}
                            className="shrink-0 rounded-md px-2 py-1 text-xs text-red-500 transition hover:bg-red-50"
                          >
                            {t('delete')}
                          </motion.button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
                {recipeItems.length > 0 ? (
                  <Button
                    className="w-full gap-2"
                    onClick={() => {
                      setShowRecipeSheet(false)
                      setShowPromptSheet(true)
                    }}
                  >
                    <Sparkles size={16} /> {t('generatePrompt')}
                  </Button>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showPromptSheet ? (
          <motion.div
            className="fixed inset-0 z-40 bg-black/35"
            onClick={() => setShowPromptSheet(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <motion.div
              className="absolute inset-x-0 bottom-0 max-h-[75vh] rounded-t-3xl bg-(--card) p-4"
              onClick={(event) => event.stopPropagation()}
              initial={{ y: 36, opacity: 0.6 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 26, opacity: 0.5 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t('promptOutput')}</h3>
              <button type="button" onClick={() => setShowPromptSheet(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto pb-4">
              <div className="rounded-xl bg-(--background) p-3 text-sm leading-6">{promptOutput || t('noData')}</div>
              <div className="flex flex-wrap gap-2">
                {keywords.map((word) => (
                  <span key={word} className="rounded-full bg-(--muted) px-2 py-1 text-xs text-(--muted-foreground)">
                    {word}
                  </span>
                ))}
              </div>
              <Button onClick={handleCopy} className="w-full gap-2">
                <Copy size={16} /> {copied ? t('copied') : t('copyPrompt')}
              </Button>
            </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
