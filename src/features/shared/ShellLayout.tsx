import { Link, Outlet, useLocation } from 'react-router-dom'
import { MonitorSmartphone, LayoutGrid, NotebookText, Scissors } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { H5BottomBar } from '@/features/h5/H5BottomBar'
import { H5TabBar } from '@/features/h5/H5TabBar'

type ShellLayoutProps = {
  basePath: '/m' | '/pc'
  terminalLabel: 'H5' | 'PC'
}

const relativeNavItems = [
  { suffix: '', label: '首页', icon: MonitorSmartphone },
  { suffix: '/features', label: '功能页', icon: LayoutGrid },
  { suffix: '/about', label: '关于页', icon: NotebookText },
  { suffix: '/cut-tool', label: '剪切工具', icon: Scissors },
]

export function ShellLayout({ basePath, terminalLabel }: ShellLayoutProps) {
  const location = useLocation()
  const navItems = relativeNavItems.map((item) => ({
    to: `${basePath}${item.suffix}`,
    label: item.label,
    icon: item.icon,
  }))

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
      {basePath === '/m' ? (
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-(--muted-foreground)">snapPrompt</p>
            <h1 className="text-xl font-semibold leading-tight">PromptCraft</h1>
          </div>
        </header>
      ) : (
        <header className="mb-6 rounded-2xl border border-(--border) bg-(--card)/90 p-4 backdrop-blur md:mb-8 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-(--muted-foreground)">snapPrompt</p>
              <h1 className="mt-1 text-2xl font-semibold md:text-3xl">{terminalLabel} PromptCraft</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              {navItems.map(({ to, label, icon: Icon }) => {
                const active = location.pathname === to || location.pathname.startsWith(`${to}/`)
                return (
                  <Link key={to} to={to}>
                    <Button variant={active ? 'default' : 'secondary'} size="sm" className="gap-2 rounded-full">
                      <Icon size={14} />
                      {label}
                    </Button>
                  </Link>
                )
              })}
            </div>
          </div>
        </header>
      )}

      <main>
        <Outlet />
      </main>
      {basePath === '/m' ? <H5BottomBar /> : null}
      {basePath === '/m' ? <H5TabBar /> : null}
    </div>
  )
}
