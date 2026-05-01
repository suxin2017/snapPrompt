import { Navigate, createHashRouter } from 'react-router-dom'

import { H5RecipeProvider } from '@/contexts/h5RecipeContext'
import { I18nProvider } from '@/contexts/i18nContext'
import { ShellLayout } from '@/features/shared/ShellLayout'
import { HomePage } from '@/pages/HomePage'
import { FeaturesPage } from '@/pages/FeaturesPage'
import { AboutPage } from '@/pages/AboutPage'
import { BlocksPreviewPage } from '@/pages/BlocksPreviewPage'
import { CutToolPage } from '@/pages/CutToolPage'
import { RandomConfigPage } from '@/pages/RandomConfigPage'

const isFullMode = import.meta.env.DEV || import.meta.env.VITE_BUILD_TARGET === 'full'
const defaultPath = isFullMode ? '/pc' : '/m/random-config'

function RootRedirect() {
  let saved: string | null = null
  try { saved = localStorage.getItem('lastRoute') } catch { /* noop */ }
  const normalizedSaved = saved ?? ''

  const isValidSavedRoute = isFullMode
    ? normalizedSaved.startsWith('/')
    : normalizedSaved === '/m/cut-tool' || normalizedSaved === '/m/random-config'

  const target = isValidSavedRoute ? normalizedSaved : defaultPath
  return <Navigate to={target} replace />
}

const h5Routes = [
  {
    path: '/m',
    element: (
      <I18nProvider>
        <H5RecipeProvider>
          <ShellLayout basePath="/m" terminalLabel="H5" />
        </H5RecipeProvider>
      </I18nProvider>
    ),
    children: [
      { index: true, element: <Navigate to="random-config" replace /> },
      { path: 'cut-tool', element: <CutToolPage terminal="h5" /> },
      { path: 'random-config', element: <RandomConfigPage /> },
      { path: 'about', element: <Navigate to="/m/cut-tool" replace /> },
    ],
  },
]

const pcRoutes = isFullMode
  ? [
      {
        path: '/pc',
        element: <ShellLayout basePath="/pc" terminalLabel="PC" />,
        children: [
          { index: true, element: <HomePage terminal="pc" /> },
          { path: 'features', element: <FeaturesPage terminal="pc" /> },
          { path: 'about', element: <AboutPage terminal="pc" /> },
          { path: 'blocks-preview', element: <BlocksPreviewPage /> },
          { path: 'cut-tool', element: <CutToolPage terminal="pc" /> },
        ],
      },
    ]
  : [{ path: '/pc/*', element: <Navigate to="/m" replace /> }]

export const router = createHashRouter([
  {
    path: '/',
    element: <RootRedirect />,
  },
  ...h5Routes,
  ...pcRoutes,
])
