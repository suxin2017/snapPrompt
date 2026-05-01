import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { H5BottomBar } from '@/features/h5/H5BottomBar'
import { PCHeader } from '@/features/shared/PCHeader'
import { useThemeColor } from '@/hooks/useThemeColor'

type ShellLayoutProps = {
  basePath: '/m' | '/pc'
  terminalLabel: 'H5' | 'PC'
}

export function ShellLayout({ basePath }: ShellLayoutProps) {
  const { pathname } = useLocation()

  useThemeColor(pathname)

  useEffect(() => {
    if (pathname && pathname !== '/') {
      try { localStorage.setItem('lastRoute', pathname) } catch { /* noop */ }
    }
  }, [pathname])

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
      {basePath !== '/m' && <PCHeader basePath="/pc" terminalLabel="PC" />}

      <main>
        <Outlet />
      </main>
      {basePath === '/m' ? <H5BottomBar /> : null}
    </div>
  )
}
