import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import { router } from '@/app/router'

let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined

updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    void updateSW?.(true)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
