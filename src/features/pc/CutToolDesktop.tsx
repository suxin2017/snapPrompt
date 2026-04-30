import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import JSZip from 'jszip'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'

type IconPrompt = {
  title_cn?: string
  prompt_en?: string
}

type RawLayoutPayload = {
  image_type?: string
  layout?: {
    rows?: number
    columns?: number
    first_icon_start?: { x?: number; y?: number }
    cutting_note?: {
      sub_icon_size_recommend?: { width?: number; height?: number }
      horizontal_gap_recommend?: number
      vertical_gap_recommend?: number
    }
  }
  icons?: IconPrompt[]
}

type BaseLayout = {
  rows: number
  columns: number
  startX: number
  startY: number
  itemWidth: number
  itemHeight: number
  horizontalGap: number
  verticalGap: number
}

type ManualOverrides = Partial<BaseLayout>

type SliceRect = {
  index: number
  row: number
  col: number
  title: string
  prompt: string
  rawX: number
  rawY: number
  rawWidth: number
  rawHeight: number
  x: number
  y: number
  width: number
  height: number
  clipped: boolean
  valid: boolean
}

const SAMPLE_JSON = `{
  "image_type": "女生裙子分类图例",
  "layout": {
    "rows": 2,
    "columns": 4,
    "first_icon_start": {
      "x": 152,
      "y": 15
    },
    "cutting_note": {
      "sub_icon_size_recommend": {
        "width": 300,
        "height": 422
      },
      "horizontal_gap_recommend": 220,
      "vertical_gap_recommend": 24
    }
  },
  "icons": [
    { "title_cn": "牛仔迷你裙", "prompt_en": "denim mini skirt" },
    { "title_cn": "A字裙", "prompt_en": "a-line skirt" },
    { "title_cn": "百褶裙", "prompt_en": "pleated skirt" },
    { "title_cn": "铅笔裙", "prompt_en": "pencil skirt" },
    { "title_cn": "裹身裙", "prompt_en": "wrap skirt" },
    { "title_cn": "蓬蓬裙", "prompt_en": "tutu skirt" },
    { "title_cn": "鱼尾裙", "prompt_en": "mermaid skirt" },
    { "title_cn": "长裙", "prompt_en": "maxi skirt" }
  ]
}`

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function toInt(value: unknown, fallback: number, min = 1) {
  if (!isFiniteNumber(value)) {
    return fallback
  }
  return Math.max(min, Math.round(value))
}

function toNonNegative(value: unknown, fallback: number) {
  if (!isFiniteNumber(value)) {
    return fallback
  }
  return Math.max(0, value)
}

function sanitizeFilename(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '-').slice(0, 40) || 'slice'
}

function parseLayoutPayload(input: string): {
  payload: RawLayoutPayload | null
  baseLayout: BaseLayout | null
  error: string | null
  warnings: string[]
} {
  const warnings: string[] = []

  if (!input.trim()) {
    return {
      payload: null,
      baseLayout: null,
      error: '请输入 JSON 配置。',
      warnings,
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  } catch {
    return {
      payload: null,
      baseLayout: null,
      error: 'JSON 格式错误，请检查逗号和引号。',
      warnings,
    }
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return {
      payload: null,
      baseLayout: null,
      error: 'JSON 顶层必须是对象。',
      warnings,
    }
  }

  const payload = parsed as RawLayoutPayload
  const rows = toInt(payload.layout?.rows, 1)
  const columns = toInt(payload.layout?.columns, 1)
  const startX = toNonNegative(payload.layout?.first_icon_start?.x, 0)
  const startY = toNonNegative(payload.layout?.first_icon_start?.y, 0)
  const itemWidth = toInt(payload.layout?.cutting_note?.sub_icon_size_recommend?.width, 1)
  const itemHeight = toInt(payload.layout?.cutting_note?.sub_icon_size_recommend?.height, 1)
  const horizontalGap = toNonNegative(payload.layout?.cutting_note?.horizontal_gap_recommend, 0)
  const verticalGap = toNonNegative(payload.layout?.cutting_note?.vertical_gap_recommend, 0)

  if (!payload.layout) {
    warnings.push('未提供 layout，已回退到默认值。')
  }

  return {
    payload,
    baseLayout: {
      rows,
      columns,
      startX,
      startY,
      itemWidth,
      itemHeight,
      horizontalGap,
      verticalGap,
    },
    error: null,
    warnings,
  }
}

function getNumberInputValue(value: number | undefined) {
  return value === undefined ? '' : value
}

function readNumericInput(value: string) {
  if (!value.trim()) {
    return undefined
  }
  const asNumber = Number(value)
  if (!Number.isFinite(asNumber)) {
    return undefined
  }
  return asNumber
}

function SliceThumbnail({
  imageUrl,
  slice,
}: {
  imageUrl: string
  slice: SliceRect
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, slice.x, slice.y, slice.width, slice.height, 0, 0, slice.width, slice.height)
    }
    img.src = imageUrl
  }, [imageUrl, slice])

  return (
    <canvas
      ref={canvasRef}
      width={slice.width}
      height={slice.height}
      className="block h-36 w-full rounded-md object-contain"
      style={{ imageRendering: 'auto' }}
    />
  )
}

function SlicePreviewCanvas({
  imageUrl,
  slice,
}: {
  imageUrl: string
  slice: SliceRect
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, slice.x, slice.y, slice.width, slice.height, 0, 0, slice.width, slice.height)
    }
    img.src = imageUrl
  }, [imageUrl, slice])

  return (
    <canvas
      ref={canvasRef}
      width={slice.width}
      height={slice.height}
      className="block max-h-[70vh] max-w-full rounded-lg"
    />
  )
}

export function CutToolDesktop() {
  const [jsonText, setJsonText] = useState(SAMPLE_JSON)
  const [manualOverrides, setManualOverrides] = useState<ManualOverrides>({})
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageName, setImageName] = useState('uploaded-image')
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [exporting, setExporting] = useState(false)
  const [previewSlice, setPreviewSlice] = useState<SliceRect | null>(null)

  useEffect(() => {
    if (!previewSlice) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewSlice(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previewSlice])

  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl)
      }
    }
  }, [imageUrl])

  const parsedResult = useMemo(() => parseLayoutPayload(jsonText), [jsonText])

  const effectiveLayout = useMemo(() => {
    if (!parsedResult.baseLayout) {
      return null
    }

    return {
      rows: Math.max(1, Math.round(manualOverrides.rows ?? parsedResult.baseLayout.rows)),
      columns: Math.max(1, Math.round(manualOverrides.columns ?? parsedResult.baseLayout.columns)),
      startX: Math.max(0, manualOverrides.startX ?? parsedResult.baseLayout.startX),
      startY: Math.max(0, manualOverrides.startY ?? parsedResult.baseLayout.startY),
      itemWidth: Math.max(1, Math.round(manualOverrides.itemWidth ?? parsedResult.baseLayout.itemWidth)),
      itemHeight: Math.max(1, Math.round(manualOverrides.itemHeight ?? parsedResult.baseLayout.itemHeight)),
      horizontalGap: Math.max(0, manualOverrides.horizontalGap ?? parsedResult.baseLayout.horizontalGap),
      verticalGap: Math.max(0, manualOverrides.verticalGap ?? parsedResult.baseLayout.verticalGap),
    }
  }, [manualOverrides, parsedResult.baseLayout])

  const slices = useMemo(() => {
    if (!effectiveLayout || !parsedResult.payload || imageSize.width <= 0 || imageSize.height <= 0) {
      return [] as SliceRect[]
    }

    const result: SliceRect[] = []
    const total = effectiveLayout.rows * effectiveLayout.columns
    const icons = parsedResult.payload.icons ?? []

    for (let index = 0; index < total; index += 1) {
      const row = Math.floor(index / effectiveLayout.columns)
      const col = index % effectiveLayout.columns
      const rawX = effectiveLayout.startX + col * (effectiveLayout.itemWidth + effectiveLayout.horizontalGap)
      const rawY = effectiveLayout.startY + row * (effectiveLayout.itemHeight + effectiveLayout.verticalGap)
      const rawWidth = effectiveLayout.itemWidth
      const rawHeight = effectiveLayout.itemHeight

      const left = clamp(rawX, 0, imageSize.width)
      const top = clamp(rawY, 0, imageSize.height)
      const right = clamp(rawX + rawWidth, 0, imageSize.width)
      const bottom = clamp(rawY + rawHeight, 0, imageSize.height)
      const width = Math.max(0, right - left)
      const height = Math.max(0, bottom - top)
      const valid = width > 0 && height > 0

      const icon = icons[index]
      result.push({
        index,
        row,
        col,
        title: icon?.title_cn?.trim() || `图例${index + 1}`,
        prompt: icon?.prompt_en?.trim() || '',
        rawX,
        rawY,
        rawWidth,
        rawHeight,
        x: left,
        y: top,
        width,
        height,
        clipped: valid && (left !== rawX || top !== rawY || width !== rawWidth || height !== rawHeight),
        valid,
      })
    }

    return result
  }, [effectiveLayout, imageSize.height, imageSize.width, parsedResult.payload])

  const warnings = useMemo(() => {
    const all = [...parsedResult.warnings]
    if (!effectiveLayout || !parsedResult.payload) {
      return all
    }

    const expected = effectiveLayout.rows * effectiveLayout.columns
    const iconsCount = parsedResult.payload.icons?.length ?? 0
    if (iconsCount !== expected) {
      all.push(`icons 数量为 ${iconsCount}，网格数量为 ${expected}，系统按网格数量切割。`)
    }

    const clippedCount = slices.filter((item) => item.clipped).length
    if (clippedCount > 0) {
      all.push(`${clippedCount} 个切片发生边界裁切。`)
    }

    const invalidCount = slices.filter((item) => !item.valid).length
    if (invalidCount > 0) {
      all.push(`${invalidCount} 个切片完全越界，已在导出中忽略。`)
    }

    return all
  }, [effectiveLayout, parsedResult.payload, parsedResult.warnings, slices])

  const hasBlockingError = Boolean(parsedResult.error)
  const validSlices = slices.filter((item) => item.valid)

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setImageName(file.name.replace(/\.[^.]+$/, '') || 'uploaded-image')
    setImageSize({ width: 0, height: 0 })
    setImageUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl)
      }
      return objectUrl
    })
  }

  const handleOverrideChange = (key: keyof BaseLayout, value: string) => {
    const parsed = readNumericInput(value)
    setManualOverrides((current) => {
      if (parsed === undefined) {
        const next = { ...current }
        delete next[key]
        return next
      }
      return { ...current, [key]: parsed }
    })
  }

  const handleOverrideKeyDown = (
    key: keyof BaseLayout,
    currentValue: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    event.preventDefault()
    const step = event.shiftKey ? 10 : 1
    const delta = event.key === 'ArrowUp' ? step : -step
    const next = currentValue + delta
    setManualOverrides((current) => ({ ...current, [key]: next }))
  }

  const resetOverrides = () => {
    setManualOverrides({})
  }

  const fillSample = () => {
    setJsonText(SAMPLE_JSON)
    setManualOverrides({})
  }

  const handleExportZip = async () => {
    if (!imageUrl || validSlices.length === 0 || exporting) {
      return
    }

    setExporting(true)

    try {
      const image = new Image()
      image.src = imageUrl
      await image.decode()

      const zip = new JSZip()
      const metaList: { uuid: string; filename: string; title_cn: string; prompt_en: string }[] = []

      for (const item of validSlices) {
        const canvas = document.createElement('canvas')
        canvas.width = item.width
        canvas.height = item.height
        const context = canvas.getContext('2d')
        if (!context) {
          continue
        }

        context.drawImage(image, item.x, item.y, item.width, item.height, 0, 0, item.width, item.height)
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((result) => resolve(result), 'image/png')
        })

        if (!blob) {
          continue
        }

        const uuid = crypto.randomUUID()
        const filename = `${String(item.index + 1).padStart(2, '0')}-${sanitizeFilename(item.title)}.png`
        zip.file(filename, blob)
        metaList.push({ uuid, filename, title_cn: item.title, prompt_en: item.prompt })
      }

      const imageType = parsedResult.payload?.image_type?.trim() || imageName
      zip.file('meta.json', JSON.stringify(metaList, null, 2))

      const archive = await zip.generateAsync({ type: 'blob' })
      const defaultFilename = `${sanitizeFilename(imageType)}.zip`

      if ('showSaveFilePicker' in window) {
        try {
          const fileHandle = await (window as typeof window & {
            showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle>
          }).showSaveFilePicker({
            suggestedName: defaultFilename,
            types: [{ description: 'ZIP 文件', accept: { 'application/zip': ['.zip'] } }],
          })
          const writable = await fileHandle.createWritable()
          await writable.write(archive)
          await writable.close()
        } catch (err) {
          // User cancelled the picker — do nothing
          if (err instanceof Error && err.name !== 'AbortError') throw err
        }
      } else {
        const href = URL.createObjectURL(archive)
        const anchor = document.createElement('a')
        anchor.href = href
        anchor.download = defaultFilename
        anchor.click()
        URL.revokeObjectURL(href)
      }
    } finally {
      setExporting(false)
    }
  }

  const overlayEnabled = imageUrl && imageSize.width > 0 && imageSize.height > 0 && !hasBlockingError

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-(--border) bg-(--card)/90 p-6">
        <h2 className="text-2xl font-semibold">PC 图例切片工具</h2>
        <p className="mt-2 text-sm text-(--muted-foreground)">
          上传原图，粘贴 JSON 布局，系统按 rows/columns 和起点、尺寸、间距自动切片。建议值可手动微调。
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="space-y-4 rounded-2xl border border-(--border) bg-(--card)/95 p-5">
          <div className="space-y-2">
            <p className="text-sm font-semibold">1) 上传原图</p>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleImageUpload}
              className="w-full rounded-xl border border-(--border) bg-white px-3 py-2 text-sm"
            />
            <p className="text-xs text-(--muted-foreground)">默认白底、主体居中、边界清晰的图更适合自动切片。</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">2) 输入 JSON</p>
              <Button variant="ghost" size="sm" onClick={fillSample}>
                填充示例
              </Button>
            </div>
            <textarea
              value={jsonText}
              onChange={(event) => setJsonText(event.target.value)}
              className="h-72 w-full resize-y rounded-xl border border-(--border) bg-white px-3 py-2 font-mono text-xs leading-5"
            />
            {parsedResult.error ? <p className="text-xs text-red-600">{parsedResult.error}</p> : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">3) 手动微调</p>
              <Button variant="secondary" size="sm" onClick={resetOverrides}>
                重置微调
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {effectiveLayout
                ? ([
                    ['rows', '行数', effectiveLayout.rows],
                    ['columns', '列数', effectiveLayout.columns],
                    ['startX', '起点 X', effectiveLayout.startX],
                    ['startY', '起点 Y', effectiveLayout.startY],
                    ['itemWidth', '宽度', effectiveLayout.itemWidth],
                    ['itemHeight', '高度', effectiveLayout.itemHeight],
                    ['horizontalGap', '横向间距', effectiveLayout.horizontalGap],
                    ['verticalGap', '纵向间距', effectiveLayout.verticalGap],
                  ] as const).map(([key, label, value]) => (
                    <label key={key} className="space-y-1 text-xs">
                      <span className="text-(--muted-foreground)">{label}</span>
                      <input
                        type="number"
                        value={getNumberInputValue(manualOverrides[key] ?? value)}
                        onChange={(event) => handleOverrideChange(key, event.target.value)}
                        onKeyDown={(event) => handleOverrideKeyDown(key, manualOverrides[key] ?? value, event)}
                        className="w-full rounded-lg border border-(--border) bg-white px-2 py-1.5 text-sm"
                      />
                    </label>
                  ))
                : null}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-(--border) bg-(--card)/95 p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">预览与叠层</p>
              <Button onClick={handleExportZip} disabled={!imageUrl || validSlices.length === 0 || hasBlockingError || exporting}>
                {exporting ? '导出中...' : `导出 ZIP (${validSlices.length})`}
              </Button>
            </div>

            {!imageUrl ? (
              <div className="rounded-xl border border-dashed border-(--border) bg-(--muted)/40 p-10 text-center text-sm text-(--muted-foreground)">
                请先上传一张图片
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-(--border) bg-white p-3">
                <div className="relative mx-auto w-fit max-w-full">
                  <img
                    src={imageUrl}
                    alt="preview"
                    onLoad={(event) => {
                      const img = event.currentTarget
                      setImageSize({ width: img.naturalWidth, height: img.naturalHeight })
                    }}
                    className="block max-h-140 max-w-full rounded-lg"
                  />
                  {overlayEnabled ? (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
                      {slices.map((item) => {
                        const color = !item.valid ? 'border-red-500 bg-red-500/10' : item.clipped ? 'border-amber-500 bg-amber-500/10' : 'border-emerald-500 bg-emerald-500/10'
                        return (
                          <div
                            key={item.index}
                            className={`absolute border text-[10px] text-black ${color}`}
                            style={{
                              left: `${(item.rawX / imageSize.width) * 100}%`,
                              top: `${(item.rawY / imageSize.height) * 100}%`,
                              width: `${(item.rawWidth / imageSize.width) * 100}%`,
                              height: `${(item.rawHeight / imageSize.height) * 100}%`,
                            }}
                          >
                            <span className="inline-block rounded-br bg-black/70 px-1 py-0.5 text-[10px] text-white">
                              {item.index + 1}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="rounded-2xl border border-(--border) bg-(--card)/95 p-5">
        <p className="mb-3 text-sm font-semibold">切片结果 ({slices.length})</p>
        {warnings.length > 0 ? (
          <div className="mb-4 space-y-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {warnings.map((item, index) => (
              <p key={`${item}-${index}`}>• {item}</p>
            ))}
          </div>
        ) : null}

        {slices.length === 0 ? (
          <p className="text-sm text-(--muted-foreground)">暂无切片结果。上传图片并输入有效 JSON 后自动生成。</p>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
            {slices.map((item) => (
              <article
                key={item.index}
                onClick={() => { if (item.valid) setPreviewSlice(item) }}
                className={`space-y-2 rounded-xl border border-(--border) bg-white p-3 transition-shadow ${
                  item.valid ? 'cursor-pointer hover:shadow-md hover:ring-2 hover:ring-(--primary)/40' : 'opacity-60'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-(--muted-foreground)">
                  <span className="truncate font-medium">#{item.index + 1} {item.title}</span>
                  <span className="ml-1 shrink-0">{item.valid ? `${item.width}×${item.height}` : '无效'}</span>
                </div>
                {imageUrl && item.valid ? (
                  <div className="overflow-hidden rounded-md border border-(--border) bg-(--muted)/30">
                    <SliceThumbnail imageUrl={imageUrl} slice={item} />
                  </div>
                ) : (
                  <div className="flex h-28 items-center justify-center rounded-md border border-dashed border-red-300 bg-red-50 text-xs text-red-600">
                    切片越界
                  </div>
                )}
                <p className="line-clamp-1 text-xs text-(--muted-foreground)">{item.prompt || '—'}</p>
              </article>
            ))}
          </div>
        )}
      </div>

      {previewSlice !== null && imageUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
          onClick={() => setPreviewSlice(null)}
        >
          <div
            className="relative max-w-[90vw] rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-6">
              <div>
                <p className="text-base font-semibold">#{previewSlice.index + 1} {previewSlice.title}</p>
                <p className="mt-0.5 text-xs text-(--muted-foreground)">
                  {previewSlice.prompt && <span className="mr-2">{previewSlice.prompt}</span>}
                  ({previewSlice.x}, {previewSlice.y}) · {previewSlice.width}×{previewSlice.height}
                  {previewSlice.clipped ? ' · 已裁边' : ''}
                </p>
              </div>
              <button
                onClick={() => setPreviewSlice(null)}
                className="rounded-full p-1 text-(--muted-foreground) hover:bg-(--muted) hover:text-(--foreground)"
              >
                <X size={18} />
              </button>
            </div>
            <SlicePreviewCanvas imageUrl={imageUrl} slice={previewSlice} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
