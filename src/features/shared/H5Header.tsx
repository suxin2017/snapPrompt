import { useI18n } from '@/contexts/i18nContext'

export function H5Header() {
  const { t } = useI18n()

  return (
    <header className="mb-6 flex items-center justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-(--muted-foreground)">{t('snapPrompt')}</p>
        <h1 className="text-2xl font-semibold leading-tight">{t('promptCraft')}</h1>
      </div>
      <span className="rounded-lg bg-(--muted) px-3 py-1.5 text-xs font-medium text-(--muted-foreground)">中文</span>
    </header>
  )
}
