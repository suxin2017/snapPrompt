import { useI18n } from '@/contexts/i18nContext'

export function H5Header() {
  const { language, setLanguage } = useI18n()

  return (
    <header className="mb-6 flex items-center justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-(--muted-foreground)">snapPrompt</p>
        <h1 className="text-2xl font-semibold leading-tight">PromptCraft</h1>
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setLanguage('zh')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            language === 'zh'
              ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
              : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
          }`}
        >
          中文
        </button>
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            language === 'en'
              ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
              : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
          }`}
        >
          English
        </button>
      </div>
    </header>
  )
}
