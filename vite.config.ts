import { spawn } from 'node:child_process'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

const ICON_VERSION = '20260501v2'
const DATASET_PREPARE_ROUTE = '/__dev/prepare-datasets'
const LIST_CATEGORIES_ROUTE = '/__dev/list-categories'
const IMPORT_ZIP_ROUTE = '/__dev/import-zip'
const TITLE_INDEX_ROUTE = '/__dev/title-index'

function devDatasetsPlugin(): Plugin {
  const assetsRoot = path.resolve(__dirname, 'src/assets')
  let activeRun: Promise<{
    ok: boolean
    exitCode: number | null
    stdout: string
    stderr: string
    durationMs: number
  }> | null = null

  return {
    name: 'dev-datasets-plugin',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? new URL(req.url, 'http://localhost') : null

        if (!url) { next(); return }

        // ── List categories ──────────────────────────────────────────
        if (url.pathname === LIST_CATEGORIES_ROUTE && req.method === 'GET') {
          try {
            const topDirs = await readdir(assetsRoot, { withFileTypes: true })
            const topCategories = topDirs
              .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
              .map((d) => d.name)
            const subCategories: Record<string, string[]> = {}
            for (const top of topCategories) {
              const subDirs = await readdir(path.join(assetsRoot, top), { withFileTypes: true })
              subCategories[top] = subDirs
                .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
                .map((d) => d.name)
            }
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ topCategories, subCategories }))
          } catch (error) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ ok: false, message: String(error) }))
          }
          return
        }

        // ── Title index ──────────────────────────────────────────────
        if (url.pathname === TITLE_INDEX_ROUTE && req.method === 'GET') {
          try {
            const dataRoot = path.resolve(__dirname, 'public/datasets/data')
            let dataFiles: string[] = []
            try {
              const entries = await readdir(dataRoot, { withFileTypes: true })
              dataFiles = entries
                .filter((e) => e.isFile() && e.name.endsWith('.json'))
                .map((e) => e.name)
            } catch {
              // datasets not yet generated — return empty index
            }

            const titleIndex: Record<string, Array<{
              datasetId: string
              datasetName: string
              title_cn: string
              prompt_en: string
              imagePath: string
            }>> = {}

            for (const filename of dataFiles) {
              try {
                const raw = await readFile(path.join(dataRoot, filename), 'utf8')
                const data = JSON.parse(raw) as {
                  datasetId?: string
                  items?: Array<{ title_cn?: string; prompt_en?: string; image?: string }>
                }
                const datasetId = data.datasetId ?? filename.replace('.json', '')
                // datasetName: derive from datasetId (no manifest read needed — just use id)
                for (const item of data.items ?? []) {
                  const titleCn = (item.title_cn ?? '').trim()
                  if (!titleCn) continue
                  const key = titleCn.toLowerCase()
                  if (!titleIndex[key]) titleIndex[key] = []
                  titleIndex[key].push({
                    datasetId,
                    datasetName: datasetId,
                    title_cn: titleCn,
                    prompt_en: (item.prompt_en ?? '').trim(),
                    imagePath: (item.image ?? '').trim(),
                  })
                }
              } catch {
                // skip unreadable files
              }
            }

            // Enrich datasetName from manifest if available
            try {
              const manifestRaw = await readFile(path.resolve(__dirname, 'public/datasets/manifest.json'), 'utf8')
              const manifest = JSON.parse(manifestRaw) as { items?: Array<{ id: string; name: string }> }
              const nameMap = new Map((manifest.items ?? []).map((it) => [it.id, it.name]))
              for (const entries of Object.values(titleIndex)) {
                for (const entry of entries) {
                  const name = nameMap.get(entry.datasetId)
                  if (name) entry.datasetName = name
                }
              }
            } catch {
              // no manifest yet
            }

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ titleIndex }))
          } catch (error) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ ok: false, message: String(error) }))
          }
          return
        }

        // ── Import zip ───────────────────────────────────────────────
        if (url.pathname === IMPORT_ZIP_ROUTE && req.method === 'POST') {          try {
            const topCategory = (url.searchParams.get('topCategory') ?? '').trim()
            const subCategory = (url.searchParams.get('subCategory') ?? '').trim()
            const filename = (url.searchParams.get('filename') ?? '').trim()

            const rejectWith = (msg: string) => {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ ok: false, message: msg }))
            }

            if (!filename || !filename.endsWith('.zip') || /[/\\]/.test(filename) || filename.includes('..')) {
              rejectWith('文件名无效，必须以 .zip 结尾且不含路径字符。')
              return
            }

            const parts: string[] = [assetsRoot]
            if (topCategory) parts.push(topCategory)
            if (subCategory) parts.push(subCategory)
            const targetDir = path.join(...parts)
            const resolvedDir = path.resolve(targetDir)
            const resolvedAssets = path.resolve(assetsRoot)

            if (resolvedDir !== resolvedAssets && !resolvedDir.startsWith(resolvedAssets + path.sep)) {
              rejectWith('目标路径超出 src/assets 范围。')
              return
            }

            const chunks: Buffer[] = []
            await new Promise<void>((resolve, reject) => {
              req.on('data', (chunk: Buffer) => chunks.push(chunk))
              req.on('end', resolve)
              req.on('error', reject)
            })
            const buffer = Buffer.concat(chunks)

            if (buffer.length === 0) {
              rejectWith('文件内容为空。')
              return
            }

            await mkdir(targetDir, { recursive: true })
            const destPath = path.join(targetDir, filename)
            await writeFile(destPath, buffer)

            const savedPath = path.relative(path.resolve(__dirname), destPath)
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ ok: true, savedPath }))
          } catch (error) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ ok: false, message: String(error) }))
          }
          return
        }

        // ── Prepare datasets ─────────────────────────────────────────
        if (url.pathname !== DATASET_PREPARE_ROUTE) { next(); return }

        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ ok: false, message: 'Method Not Allowed' }))
          return
        }

        if (activeRun) {
          res.statusCode = 409
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ ok: false, message: 'Dataset generation is already running.' }))
          return
        }

        const startedAt = Date.now()
        const command = process.execPath
        const scriptPath = path.resolve(__dirname, 'scripts/prepare-datasets.mjs')

        activeRun = new Promise((resolve) => {
          const child = spawn(command, [scriptPath], {
            cwd: __dirname,
            env: process.env,
          })

          let stdout = ''
          let stderr = ''

          child.stdout.on('data', (chunk) => {
            stdout += chunk.toString()
          })

          child.stderr.on('data', (chunk) => {
            stderr += chunk.toString()
          })

          child.on('error', (error) => {
            stderr += `${error.message}\n`
          })

          child.on('close', (exitCode) => {
            const durationMs = Date.now() - startedAt
            resolve({
              ok: exitCode === 0,
              exitCode,
              stdout,
              stderr,
              durationMs,
            })
          })
        })

        const result = await activeRun
        activeRun = null

        res.statusCode = result.ok ? 200 : 500
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify(result))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    devDatasetsPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'SnapPrompt',
        short_name: 'SnapPrompt',
        description: '离线可用的提示词素材库',
        theme_color: '#f4efe7',
        background_color: '#f4efe7',
        display: 'standalone',
        scope: '/',
        start_url: '/#/m',
        icons: [
          {
            src: `/icon-192.png?v=${ICON_VERSION}`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: `/icon-512.png?v=${ICON_VERSION}`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: `/icon-512.png?v=${ICON_VERSION}`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) =>
              request.method === 'GET' && url.pathname === '/datasets/manifest.json',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'datasets-manifest',
            },
          },
          {
            urlPattern: ({ request, url }) =>
              request.method === 'GET' &&
              (url.pathname.startsWith('/datasets/data/') || url.pathname.startsWith('/datasets/images/')),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'datasets-assets',
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
