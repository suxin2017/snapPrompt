import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Layers, Sparkles, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useH5Recipe } from '@/contexts/h5RecipeContext'

function buildPrompt(subject: string, items: { prompt_en: string }[]) {
  const parts: string[] = []
  if (subject.trim()) {
    parts.push(subject.trim())
  }

  for (const item of items) {
    parts.push(item.prompt_en)
  }

  return parts.join(', ')
}

export function H5BottomBar() {
  const { subject, recipeItems, removeRecipeItem } = useH5Recipe()
  const navigate = useNavigate()

  const [showRecipeSheet, setShowRecipeSheet] = useState(false)
  const [showPromptSheet, setShowPromptSheet] = useState(false)
  const [copied, setCopied] = useState(false)

  const promptOutput = useMemo(() => buildPrompt(subject, recipeItems), [subject, recipeItems])

  const keywords = useMemo(() => {
    const set = new Set<string>()
    for (const item of recipeItems) {
      for (const word of item.prompt_en.split(',')) {
        const trimmed = word.trim()
        if (trimmed) {
          set.add(trimmed)
        }
      }
    }

    return [...set]
  }, [recipeItems])

  const previewTags = recipeItems
    .slice(0, 3)
    .map((item) => item.title_cn)
    .join(' · ')

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
      <div className="fixed inset-x-0 bottom-14 z-20 mx-auto w-full max-w-6xl px-4 pb-2">
        <div className="rounded-2xl border border-(--border) bg-(--card)/95 p-3 shadow-lg backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowRecipeSheet(true)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <Layers size={16} className="shrink-0 text-[var(--primary)]" />
              <div className="min-w-0">
                <span className="text-sm font-medium">当前配方 {recipeItems.length} 个</span>
                {previewTags ? (
                  <p className="truncate text-xs text-(--muted-foreground)">{previewTags}</p>
                ) : null}
              </div>
            </button>
            <Button size="sm" variant="secondary" onClick={() => setShowRecipeSheet(true)}>
              查看
            </Button>
            <Button size="sm" onClick={handleGenerateClick} className="gap-1.5">
              <Sparkles size={14} />
              {recipeItems.length ? '生成' : '选积木'}
            </Button>
          </div>
        </div>
      </div>

      {showRecipeSheet ? (
        <div className="fixed inset-0 z-30 bg-black/30" onClick={() => setShowRecipeSheet(false)}>
          <div
            className="absolute inset-x-0 bottom-0 max-h-[70vh] rounded-t-3xl bg-(--card) p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">当前配方</h3>
              <button type="button" onClick={() => setShowRecipeSheet(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto">
              {recipeItems.length === 0 ? (
                <p className="rounded-xl bg-(--background) p-3 text-sm text-(--muted-foreground)">
                  还没有添加积木，去选择积木吧
                </p>
              ) : (
                <div className="space-y-2 pb-4">
                  {recipeItems.map((item) => (
                    <div key={item.key} className="flex items-center gap-3 rounded-xl border border-(--border) p-3">
                      <img src={item.imageUrl} alt={item.title_cn} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.title_cn}</p>
                        <p className="truncate text-xs text-(--muted-foreground)">{item.prompt_en}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRecipeItem(item.key)}
                        className="shrink-0 text-xs text-red-500"
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {recipeItems.length > 0 ? (
                <Button
                  className="w-full gap-2"
                  onClick={() => {
                    setShowRecipeSheet(false)
                    setShowPromptSheet(true)
                  }}
                >
                  <Sparkles size={16} /> 生成 Prompt
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {showPromptSheet ? (
        <div className="fixed inset-0 z-40 bg-black/35" onClick={() => setShowPromptSheet(false)}>
          <div
            className="absolute inset-x-0 bottom-0 max-h-[75vh] rounded-t-3xl bg-(--card) p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Prompt 输出</h3>
              <button type="button" onClick={() => setShowPromptSheet(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto pb-4">
              <div className="rounded-xl bg-(--background) p-3 text-sm leading-6">{promptOutput || '暂无内容'}</div>
              <div className="flex flex-wrap gap-2">
                {keywords.map((word) => (
                  <span key={word} className="rounded-full bg-(--muted) px-2 py-1 text-xs text-(--muted-foreground)">
                    {word}
                  </span>
                ))}
              </div>
              <Button onClick={handleCopy} className="w-full gap-2">
                <Copy size={16} /> {copied ? '已复制 ✓' : '复制 Prompt'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
