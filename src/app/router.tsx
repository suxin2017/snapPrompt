import { Navigate, createHashRouter } from 'react-router-dom'

import { H5RecipeProvider } from '@/contexts/h5RecipeContext'
import { ShellLayout } from '@/features/shared/ShellLayout'
import { HomePage } from '@/pages/HomePage'
import { FeaturesPage } from '@/pages/FeaturesPage'
import { AboutPage } from '@/pages/AboutPage'
import { CutToolPage } from '@/pages/CutToolPage'

export const router = createHashRouter([
  {
    path: '/',
    element: <Navigate to="/pc" replace />,
  },
  {
    path: '/m',
    element: (
      <H5RecipeProvider>
        <ShellLayout basePath="/m" terminalLabel="H5" />
      </H5RecipeProvider>
    ),
    children: [
      { index: true, element: <HomePage terminal="h5" /> },
      { path: 'features', element: <FeaturesPage terminal="h5" /> },
      { path: 'about', element: <AboutPage terminal="h5" /> },
      { path: 'cut-tool', element: <CutToolPage terminal="h5" /> },
    ],
  },
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
])
