import { Link, useLocation } from 'react-router-dom'
import { LayoutGrid, NotebookText, Scissors } from 'lucide-react'

interface PCHeaderProps {
  terminalLabel: 'PC'
  basePath: '/pc'
}

const navItems = [
  { suffix: '', label: '首页' },
  { suffix: '/features', label: '功能页' },
  { suffix: '/about', label: '关于页' },
  { suffix: '/cut-tool', label: '剪切工具' },
]

const icons = [LayoutGrid, NotebookText, Scissors]

export function PCHeader({ terminalLabel, basePath }: PCHeaderProps) {
  const location = useLocation()

  return (
    <header className="mb-6 rounded-2xl border border-(--border) bg-(--card)/90 p-4 backdrop-blur md:mb-8 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-(--muted-foreground)">snapPrompt</p>
          <h1 className="mt-1 text-2xl font-semibold md:text-3xl">{terminalLabel} PromptCraft</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {navItems.map(({ suffix, label }, index) => {
            const to = `${basePath}${suffix}`
            const isActive = location.pathname === to
            const Icon = icons[index % icons.length]
            return (
              <Link
                key={to}
                to={to}
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition ${
                  isActive
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                    : 'hover:bg-(--muted) text-(--muted-foreground) hover:text-(--foreground)'
                }`}
              >
                <Icon size={14} />
                {label}
              </Link>
            )
          })}
        </div>
      </div>
    </header>
  )
}
