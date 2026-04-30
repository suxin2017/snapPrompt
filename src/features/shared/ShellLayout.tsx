import { Outlet } from 'react-router-dom'

import { H5BottomBar } from '@/features/h5/H5BottomBar'
import { H5Header } from '@/features/shared/H5Header'
import { PCHeader } from '@/features/shared/PCHeader'

type ShellLayoutProps = {
  basePath: '/m' | '/pc'
  terminalLabel: 'H5' | 'PC'
}

export function ShellLayout({ basePath }: ShellLayoutProps) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
      {basePath === '/m' ? (
        <>
          <H5Header />
        </>
      ) : (
        <PCHeader basePath="/pc" terminalLabel="PC" />
      )}

      <main>
        <Outlet />
      </main>
      {basePath === '/m' ? <H5BottomBar /> : null}
    </div>
  )
}
