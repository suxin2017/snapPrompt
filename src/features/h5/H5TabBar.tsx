import { Link, useLocation } from 'react-router-dom'
import { Home, Layers, Sparkles } from 'lucide-react'

const tabs = [
  { to: '/m', label: '首页', icon: Home },
  { to: '/m/cut-tool', label: '积木', icon: Layers },
  { to: '/m/random-config', label: '随机', icon: Sparkles },
]

export function H5TabBar() {
  const location = useLocation()

  return (
    <div className="fixed inset-x-0 bottom-0 z-10 mx-auto w-full max-w-6xl">
      <div className="border-t border-(--border) bg-(--card)/95 backdrop-blur">
        <div className="flex">
          {tabs.map(({ to, label, icon: Icon }) => {
            const exact = to === '/m'
            const active = exact
              ? location.pathname === to
              : location.pathname === to || location.pathname.startsWith(`${to}/`)

            return (
              <Link
                key={to}
                to={to}
                className={[
                  'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
                  active ? 'text-(--primary)' : 'text-(--muted-foreground)',
                ].join(' ')}
              >
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            )
          })}
        </div>
        {/* iOS safe area */}
        <div className="h-safe-area-inset-bottom" />
      </div>
    </div>
  )
}
