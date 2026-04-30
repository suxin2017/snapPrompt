import { X } from 'lucide-react'
import { useH5Recipe } from '@/contexts/h5RecipeContext'
import { useI18n } from '@/contexts/i18nContext'
import { Button } from '@/components/ui/button'
import type { PromptAssetItem } from '@/lib/promptDatasets'

interface AssetDetailModalProps {
  asset: PromptAssetItem | null
  onClose: () => void
}

export function AssetDetailModal({ asset, onClose }: AssetDetailModalProps) {
  const { addRecipeItem } = useH5Recipe()
  const { t } = useI18n()

  if (!asset) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md space-y-4 rounded-3xl bg-(--card) p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-(--muted-foreground) hover:text-(--foreground)"
          aria-label={t('close')}
        >
          <X size={20} />
        </button>

        {/* 图片全屏预览 */}
        <div className="mt-4">
          <img src={asset.imageUrl} alt={asset.title_cn} className="w-full rounded-2xl object-contain" />
        </div>

        {/* 标题和描述 */}
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">{asset.title_cn}</h2>
          </div>

          <div>
            <p className="text-xs font-medium text-(--muted-foreground)">{t('prompt')}</p>
            <p className="mt-1 text-sm leading-relaxed">{asset.prompt_en}</p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            {t('close')}
          </Button>
          <Button className="flex-1" onClick={() => { addRecipeItem(asset); onClose(); }}>
            {t('addToRecipe')}
          </Button>
        </div>
      </div>
    </div>
  )
}
