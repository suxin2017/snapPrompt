import { Navigate, createHashRouter } from 'react-router-dom'

import { H5RecipeProvider } from '@/contexts/h5RecipeContext'
import { I18nProvider } from '@/contexts/i18nContext'
import { ShellLayout } from '@/features/shared/ShellLayout'
import { HomePage } from '@/pages/HomePage'
import { FeaturesPage } from '@/pages/FeaturesPage'
import { AboutPage } from '@/pages/AboutPage'
import { CutToolPage } from '@/pages/CutToolPage'

const isH5OnlyBuild = import.meta.env.VITE_BUILD_TARGET === 'h5'

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
      { index: true, element: <Navigate to="cut-tool" replace /> },
      { path: 'cut-tool', element: <CutToolPage terminal="h5" /> },
    ],
  },
]

const pcRoutes = isH5OnlyBuild
  ? [{ path: '/pc/*', element: <Navigate to="/m" replace /> }]
  : [
      {
        path: '/pc',
        element: <ShellLayout basePath="/pc" terminalLabel="PC" />,
        children: [
          { index: true, element: <HomePage terminal="pc" /> },
          { path: 'features', element: <FeaturesPage terminal="pc" /> },
          { path: 'about', element: <AboutPage terminal="pc" /> },
          { path: 'cut-tool', element: <CutToolPage terminal="pc" /> },
        ],
      },
    ]

export const router = createHashRouter([
  {
    path: '/',
    element: <Navigate to={isH5OnlyBuild ? '/m' : '/pc'} replace />,
  },
  ...h5Routes,
  ...pcRoutes,
])
