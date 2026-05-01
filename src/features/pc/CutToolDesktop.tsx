import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import JSZip from 'jszip'
import { AlertTriangle, X } from 'lucide-react'

import { Button } from '@/components/ui/button'

type IconPrompt = {
  title_cn?: string
  prompt_en?: string
}

type ExistingItem = {
  datasetId: string
  datasetName: string
  title_cn: string
  prompt_en: string
  imagePath: string
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

function DuplicateCompareModal({
  slice,
  imageUrl,
  existing,
  onClose,
}: {
  slice: SliceRect
  imageUrl: string
  existing: ExistingItem[]
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-6">
          <div>
            <p className="flex items-center gap-1.5 text-base font-semibold text-orange-700">
              <AlertTriangle size={16} />
              重复标题：{slice.title}
            </p>
            <p className="mt-0.5 text-xs text-(--muted-foreground)">
              左侧为当前切片，右侧为素材库中已有的同名条目
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-(--muted-foreground) hover:bg-(--muted) hover:text-(--foreground)"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: `1fr ${existing.length > 1 ? 'repeat(auto-fill, minmax(180px, 1fr))' : '1fr'}` }}>
          {/* Current slice */}
          <div className="space-y-2 rounded-xl border-2 border-orange-300 bg-orange-50 p-3">
            <p className="text-xs font-semibold text-orange-800">当前切片（未导出）</p>
            <SlicePreviewCanvas imageUrl={imageUrl} slice={slice} />
            <p className="text-xs text-(--muted-foreground)">{slice.prompt || '—'}</p>
          </div>

          {/* Existing items */}
          {existing.map((item, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-(--border) bg-(--muted)/20 p-3">
              <p className="truncate text-xs font-semibold text-(--foreground)">已有：{item.datasetName}</p>
              {item.imagePath ? (
                <img
                  src={`/datasets/${item.imagePath}`}
                  alt={item.title_cn}
                  className="block max-h-64 w-full rounded-lg object-contain bg-white"
                />
              ) : (
                <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-(--border) text-xs text-(--muted-foreground)">
                  无图片
                </div>
              )}
              <p className="text-xs text-(--muted-foreground)">{item.prompt_en || '—'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function CutToolDesktop() {
  const datasetPrepareAvailable = import.meta.env.DEV
  const [jsonText, setJsonText] = useState(SAMPLE_JSON)
  const [manualOverrides, setManualOverrides] = useState<ManualOverrides>({})
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageName, setImageName] = useState('uploaded-image')
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [exporting, setExporting] = useState(false)
  const [preparingDatasets, setPreparingDatasets] = useState(false)
  const [prepareDatasetsStatus, setPrepareDatasetsStatus] = useState<string | null>(null)
  const [prepareDatasetsLog, setPrepareDatasetsLog] = useState<string>('')
  const [availableCategories, setAvailableCategories] = useState<{
    topCategories: string[]
    subCategories: Record<string, string[]>
  }>({ topCategories: [], subCategories: {} })
  const [importTopCat, setImportTopCat] = useState('')
  const [importSubCat, setImportSubCat] = useState('')
  const [importFilename, setImportFilename] = useState('')
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [importRunPrepare, setImportRunPrepare] = useState(true)
  const [previewSlice, setPreviewSlice] = useState<SliceRect | null>(null)
  const [excludedSliceIndices, setExcludedSliceIndices] = useState<Set<number>>(new Set())
  const [titleIndex, setTitleIndex] = useState<Map<string, ExistingItem[]>>(new Map())
  const [duplicatePreview, setDuplicatePreview] = useState<{ slice: SliceRect; existing: ExistingItem[] } | null>(null)

  useEffect(() => {
    if (!datasetPrepareAvailable) return
    fetch('/__dev/list-categories')
      .then((r) => r.json())
      .then((data: { topCategories: string[]; subCategories: Record<string, string[]> }) => {
        setAvailableCategories(data)
      })
      .catch(() => {})
  }, [datasetPrepareAvailable])

  const refreshTitleIndex = () => {
    if (!datasetPrepareAvailable) return
    fetch('/__dev/title-index')
      .then((r) => r.json())
      .then((data: { titleIndex: Record<string, ExistingItem[]> }) => {
        setTitleIndex(new Map(Object.entries(data.titleIndex)))
      })
      .catch(() => {})
  }

  useEffect(() => {
    refreshTitleIndex()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetPrepareAvailable])

  useEffect(() => {
    if (!previewSlice && !duplicatePreview) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewSlice(null)
        setDuplicatePreview(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previewSlice, duplicatePreview])

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

  const duplicateMap = useMemo(() => {
    const map = new Map<number, ExistingItem[]>()
    if (!datasetPrepareAvailable || titleIndex.size === 0) return map
    for (const slice of slices) {
      const key = slice.title.trim().toLowerCase()
      const existing = titleIndex.get(key)
      if (existing && existing.length > 0) {
        map.set(slice.index, existing)
      }
    }
    return map
  }, [datasetPrepareAvailable, slices, titleIndex])

  const warnings = useMemo(() => {    const all = [...parsedResult.warnings]
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
  const exportableSlices = validSlices.filter((item) => !excludedSliceIndices.has(item.index))

  useEffect(() => {
    // Reset exclusion state whenever the slice list is recalculated.
    setExcludedSliceIndices(new Set())
  }, [slices])

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

  const toggleSliceExcluded = (index: number) => {
    setExcludedSliceIndices((current) => {
      const next = new Set(current)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const invertExcludedForValidSlices = () => {
    setExcludedSliceIndices((current) => {
      const next = new Set<number>()
      for (const item of validSlices) {
        if (!current.has(item.index)) {
          next.add(item.index)
        }
      }
      return next
    })
  }

  const handleExportZip = async () => {
    if (!imageUrl || exportableSlices.length === 0 || exporting) {
      return
    }

    setExporting(true)

    try {
      const image = new Image()
      image.src = imageUrl
      await image.decode()

      const zip = new JSZip()
      const metaList: { uuid: string; filename: string; title_cn: string; prompt_en: string }[] = []

      for (const [queueIndex, item] of exportableSlices.entries()) {
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
        const filename = `${String(queueIndex + 1).padStart(2, '0')}-${sanitizeFilename(item.title)}.png`
        zip.file(filename, blob)
        metaList.push({ uuid, filename, title_cn: item.title, prompt_en: item.prompt })
      }

      const imageType = parsedResult.payload?.image_type?.trim() || imageName
      zip.file('meta.json', JSON.stringify(metaList, null, 2))

      const archive = await zip.generateAsync({ type: 'blob' })
      const defaultFilename = `${sanitizeFilename(imageType)}.zip`

      if (datasetPrepareAvailable) {
        setImportFilename(defaultFilename)
        setImportStatus(null)
      }

      // Only show native save dialog when not auto-importing to src/assets
      if (!(datasetPrepareAvailable && importTopCat.trim())) {
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
      }

      // If dev mode and a top category is configured, auto-import to src/assets
      if (datasetPrepareAvailable && importTopCat.trim()) {
        try {
          const filename = importFilename.trim() || defaultFilename
          const safeFilename = filename.endsWith('.zip') ? filename : `${filename}.zip`
          const params = new URLSearchParams({ topCategory: importTopCat.trim(), filename: safeFilename })
          if (importSubCat.trim()) params.set('subCategory', importSubCat.trim())

          setImportStatus('正在导入到素材库...')
          const importResponse = await fetch(`/__dev/import-zip?${params.toString()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: archive,
          })
          const importResult = (await importResponse.json()) as { ok: boolean; savedPath?: string; message?: string }

          if (!importResult.ok) {
            setImportStatus(importResult.message ?? '导入失败。')
          } else {
            fetch('/__dev/list-categories')
              .then((r) => r.json())
              .then((data: { topCategories: string[]; subCategories: Record<string, string[]> }) => setAvailableCategories(data))
              .catch(() => {})
            refreshTitleIndex()

            if (!importRunPrepare) {
              setImportStatus(`已保存到 ${importResult.savedPath}。`)
            } else {
              setImportStatus(`已保存到 ${importResult.savedPath}，正在生成 dataset...`)
              const prepResponse = await fetch('/__dev/prepare-datasets', { method: 'POST' })
              const prepResult = (await prepResponse.json()) as {
                ok: boolean; durationMs?: number; stdout?: string; stderr?: string; message?: string
              }
              const secs = prepResult.durationMs ? (prepResult.durationMs / 1000).toFixed(1) : null
              const errDetail = (prepResult.message ?? [prepResult.stdout?.trim(), prepResult.stderr?.trim()].filter(Boolean).join('\n\n')) || '未知错误'
              setImportStatus(
                prepResult.ok
                  ? (secs ? `已导入，dataset 生成完成（${secs}s）。必要时刷新页面。` : '已导入，dataset 生成完成。')
                  : `ZIP 已导入，但 dataset 生成失败：${errDetail}。`,
              )
            }
          }
        } catch (importErr) {
          setImportStatus(importErr instanceof Error ? `导入失败：${importErr.message}` : '导入失败。')
        }
      }
    } finally {
      setExporting(false)
    }
  }

  const handlePrepareDatasets = async () => {
    if (!datasetPrepareAvailable || preparingDatasets) {
      return
    }

    setPreparingDatasets(true)
    setPrepareDatasetsStatus('正在生成 dataset...')
    setPrepareDatasetsLog('')

    try {
      const response = await fetch('/__dev/prepare-datasets', {
        method: 'POST',
      })
      const result = (await response.json()) as {
        ok: boolean
        exitCode: number | null
        stdout?: string
        stderr?: string
        durationMs?: number
        message?: string
      }

      const output = [result.stdout?.trim(), result.stderr?.trim()].filter(Boolean).join('\n\n')
      setPrepareDatasetsLog(output)

      if (!response.ok || !result.ok) {
        setPrepareDatasetsStatus(result.message ?? `生成失败，退出码 ${result.exitCode ?? 'unknown'}。`)
        return
      }

      const durationSeconds = result.durationMs ? (result.durationMs / 1000).toFixed(1) : null
      setPrepareDatasetsStatus(
        durationSeconds ? `dataset 生成完成，耗时 ${durationSeconds}s。必要时刷新页面以读取最新清单。` : 'dataset 生成完成。',
      )
      refreshTitleIndex()
    } catch (error) {
      setPrepareDatasetsStatus(error instanceof Error ? `生成失败：${error.message}` : '生成失败。')
    } finally {
      setPreparingDatasets(false)
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
        {datasetPrepareAvailable ? (
          <div className="mt-4 space-y-3">
            {/* Generate dataset */}
            <div className="rounded-xl border border-(--border) bg-white/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">生成 dataset</p>
                  <p className="mt-1 text-xs text-(--muted-foreground)">
                    调用 scripts/prepare-datasets.mjs，把 src/assets 里的 zip 全部解包输出到 public/datasets。
                  </p>
                </div>
                <Button onClick={handlePrepareDatasets} disabled={preparingDatasets}>
                  {preparingDatasets ? '生成中...' : '一键生成 dataset'}
                </Button>
              </div>
              {prepareDatasetsStatus ? <p className="mt-3 text-sm text-(--foreground)">{prepareDatasetsStatus}</p> : null}
              {prepareDatasetsLog ? (
                <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-(--muted)/50 px-3 py-2 text-xs leading-5 whitespace-pre-wrap">
                  {prepareDatasetsLog}
                </pre>
              ) : null}
            </div>

            {/* Import ZIP */}
            <div className="rounded-xl border border-(--border) bg-white/80 p-4">
              <p className="text-sm font-semibold">导入 ZIP 到素材库</p>
              <p className="mt-1 text-xs text-(--muted-foreground)">
                选择 zip 文件，指定分类（顶级必填），写入 src/assets/&lt;顶级&gt;/&lt;子级&gt;/。
              </p>
              <datalist id="top-cat-list">
                {availableCategories.topCategories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <datalist id="sub-cat-list">
                {(availableCategories.subCategories[importTopCat] ?? []).map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="space-y-1 text-xs">
                  <span className="text-(--muted-foreground)">顶级分类 *</span>
                  <input
                    list="top-cat-list"
                    value={importTopCat}
                    onChange={(e) => { setImportTopCat(e.target.value); setImportSubCat('') }}
                    placeholder="如：上衣"
                    className="w-full rounded-lg border border-(--border) bg-white px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="text-(--muted-foreground)">子分类（可留空）</span>
                  <input
                    list="sub-cat-list"
                    value={importSubCat}
                    onChange={(e) => setImportSubCat(e.target.value)}
                    placeholder="如：吊带"
                    className="w-full rounded-lg border border-(--border) bg-white px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="col-span-2 space-y-1 text-xs">
                  <span className="text-(--muted-foreground)">保存文件名（可选，留空自动取 image_type）</span>
                  <input
                    value={importFilename}
                    onChange={(e) => setImportFilename(e.target.value)}
                    placeholder="xxx.zip"
                    className="w-full rounded-lg border border-(--border) bg-white px-2 py-1.5 text-sm"
                  />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-(--muted-foreground)">
                  <input
                    type="checkbox"
                    checked={importRunPrepare}
                    onChange={(e) => setImportRunPrepare(e.target.checked)}
                  />
                  导入后自动生成 dataset
                </label>
              </div>
              {importStatus ? <p className="mt-3 text-sm text-(--foreground)">{importStatus}</p> : null}
            </div>
          </div>
        ) : null}
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
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={invertExcludedForValidSlices}
                  disabled={validSlices.length === 0 || hasBlockingError || exporting}
                >
                  反选
                </Button>
                <Button onClick={handleExportZip} disabled={!imageUrl || exportableSlices.length === 0 || hasBlockingError || exporting}>
                  {exporting
                    ? (datasetPrepareAvailable && importTopCat.trim() ? '导出并导入中...' : '导出中...')
                    : (datasetPrepareAvailable && importTopCat.trim()
                        ? `导出 + 导入素材库 (${exportableSlices.length})`
                        : `导出 ZIP (${exportableSlices.length})`)}
                </Button>
              </div>
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

        {duplicateMap.size > 0 ? (
          <div className="mb-4 space-y-1 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-xs text-orange-900">
            <p className="mb-1 font-semibold flex items-center gap-1.5">
              <AlertTriangle size={13} />
              发现 {duplicateMap.size} 个切片与素材库中已有条目标题相同（点击对比）：
            </p>
            {slices
              .filter((s) => duplicateMap.has(s.index))
              .map((s) => {
                const existing = duplicateMap.get(s.index)!
                return (
                  <p
                    key={s.index}
                    className="cursor-pointer hover:underline"
                    onClick={() => setDuplicatePreview({ slice: s, existing })}
                  >
                    • #{s.index + 1} <strong>{s.title}</strong> — 已在「{existing.map((e) => e.datasetName).join('、')}」中存在
                  </p>
                )
              })}
          </div>
        ) : null}

        {slices.length === 0 ? (
          <p className="text-sm text-(--muted-foreground)">暂无切片结果。上传图片并输入有效 JSON 后自动生成。</p>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
            {slices.map((item) => (
              <article
                key={item.index}
                onClick={() => {
                  if (!item.valid) return
                  const existing = duplicateMap.get(item.index)
                  if (existing) {
                    setDuplicatePreview({ slice: item, existing })
                  } else {
                    setPreviewSlice(item)
                  }
                }}
                className={`space-y-2 rounded-xl border bg-white p-3 transition-shadow ${
                  duplicateMap.has(item.index)
                    ? 'border-orange-300 ring-1 ring-orange-200'
                    : 'border-(--border)'
                } ${
                  item.valid ? 'cursor-pointer hover:shadow-md hover:ring-2 hover:ring-(--primary)/40' : 'opacity-60'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-(--muted-foreground)">
                  <span className="truncate font-medium">#{item.index + 1} {item.title}</span>
                  <div className="ml-1 flex shrink-0 items-center gap-1">
                    {duplicateMap.has(item.index) ? (
                      <span title="与素材库已有条目重名，点击对比">
                        <AlertTriangle size={12} className="text-orange-500" />
                      </span>
                    ) : null}
                    <span>{item.valid ? `${item.width}×${item.height}` : '无效'}</span>
                  </div>
                </div>
                <label
                  className={`flex items-center gap-2 rounded-md px-2 py-1 text-xs ${
                    item.valid ? 'bg-(--muted)/40 text-(--foreground)' : 'bg-red-50 text-red-700'
                  }`}
                  onClick={(event) => event.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={item.valid ? excludedSliceIndices.has(item.index) : true}
                    disabled={!item.valid || exporting}
                    onChange={() => {
                      if (!item.valid) return
                      toggleSliceExcluded(item.index)
                    }}
                  />
                  不导出
                </label>
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

      {duplicatePreview !== null && imageUrl ? (
        <DuplicateCompareModal
          slice={duplicatePreview.slice}
          imageUrl={imageUrl}
          existing={duplicatePreview.existing}
          onClose={() => setDuplicatePreview(null)}
        />
      ) : null}

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
