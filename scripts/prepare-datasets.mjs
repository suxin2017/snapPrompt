import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import JSZip from 'jszip'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const SOURCE_ROOT = path.resolve(projectRoot, 'src/assets')
const OUTPUT_ROOT = path.resolve(projectRoot, 'public/datasets')
const DATA_ROOT = path.join(OUTPUT_ROOT, 'data')
const MANIFEST_NAME = 'manifest.json'

function buildHashId(prefix, input) {
  const hash = createHash('sha1').update(input).digest('hex').slice(0, 12)
  return `${prefix}-${hash}`
}

function buildDatasetId(relativeZipPath) {
  return buildHashId('ds', relativeZipPath)
}

function buildCategoryId(topCategory, subCategory) {
  return buildHashId('cg', `${topCategory}::${subCategory ?? ''}`)
}

function normalizeMeta(raw, fallbackFileName, index) {
  const title = (raw?.title_cn ?? '').toString().trim() || fallbackFileName.replace(/\.[^.]+$/, '')
  const prompt = (raw?.prompt_en ?? '').toString().trim() || title

  return {
    uuid: (raw?.uuid ?? `${title}-${index + 1}`).toString(),
    filename: (raw?.filename ?? fallbackFileName).toString(),
    title_cn: title,
    prompt_en: prompt,
  }
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        return walk(fullPath)
      }
      return [fullPath]
    }),
  )

  return files.flat()
}

function normalizePath(input) {
  return input.split(path.sep).join('/')
}

async function ensureDirectory(dirPath) {
  await mkdir(dirPath, { recursive: true })
}

async function writeDatasetJson(datasetId, payload) {
  await ensureDirectory(DATA_ROOT)
  const relativePath = normalizePath(path.join('data', `${datasetId}.json`))
  const absolutePath = path.join(OUTPUT_ROOT, relativePath)
  await writeFile(absolutePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  return relativePath
}

async function writeCategoryJson(categoryId, payload) {
  await ensureDirectory(path.join(DATA_ROOT, 'categories'))
  const relativePath = normalizePath(path.join('data', 'categories', `${categoryId}.json`))
  const absolutePath = path.join(OUTPUT_ROOT, relativePath)
  await writeFile(absolutePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  return relativePath
}

async function unzipDataset(sourceFilePath, sourceRoot) {
  const rel = path.relative(sourceRoot, sourceFilePath)
  const normalizedRel = normalizePath(rel)
  const datasetId = buildDatasetId(normalizedRel)
  const zipBuffer = await readFile(sourceFilePath)
  const zip = await JSZip.loadAsync(zipBuffer)

  const entries = Object.values(zip.files).filter((entry) => !entry.dir)
  const imageEntries = []
  let rawMeta = []

  for (const entry of entries) {
    const normalizedEntryName = normalizePath(entry.name)
    const lowerName = normalizedEntryName.toLowerCase()

    if (lowerName.endsWith('meta.json')) {
      const text = await entry.async('text')
      try {
        const parsed = JSON.parse(text)
        if (Array.isArray(parsed)) {
          rawMeta = parsed
        }
      } catch {
        rawMeta = []
      }
      continue
    }

    if (!/\.(png|jpg|jpeg|webp)$/i.test(lowerName)) {
      continue
    }

    imageEntries.push(entry)
  }

  const imageMap = new Map()
  for (const imageEntry of imageEntries) {
    const normalizedEntryName = normalizePath(imageEntry.name)
    const fileName = path.basename(normalizedEntryName)
    const imageRelative = normalizePath(path.join('images', datasetId, fileName))
    const imageAbsolute = path.join(OUTPUT_ROOT, imageRelative)

    await ensureDirectory(path.dirname(imageAbsolute))
    const imageBuffer = await imageEntry.async('nodebuffer')
    await writeFile(imageAbsolute, imageBuffer)
    imageMap.set(fileName, imageRelative)
  }

  const imageNames = [...imageMap.keys()].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
  const normalizedItems = []

  if (rawMeta.length > 0) {
    for (let index = 0; index < rawMeta.length; index += 1) {
      const meta = rawMeta[index]
      const defaultName = imageNames[index] ?? ''
      const normalizedMeta = normalizeMeta(meta, defaultName, index)
      const imagePath = imageMap.get(path.basename(normalizedMeta.filename)) ?? imageMap.get(defaultName)

      if (!imagePath) {
        continue
      }

      normalizedItems.push({
        ...normalizedMeta,
        image: imagePath,
      })
    }
  }

  if (normalizedItems.length === 0) {
    for (let index = 0; index < imageNames.length; index += 1) {
      const imageName = imageNames[index]
      normalizedItems.push({
        ...normalizeMeta({}, imageName, index),
        image: imageMap.get(imageName),
      })
    }
  }

  const dataPath = await writeDatasetJson(datasetId, {
    datasetId,
    sourceZipPath: normalizedRel,
    items: normalizedItems,
  })

  const info = await stat(sourceFilePath)
  const categoryRel = path.dirname(rel)

  const category = normalizePath(categoryRel) === '.' ? '' : normalizePath(categoryRel)
  const datasetName = path.basename(rel, path.extname(rel))

  return {
    manifest: {
      id: datasetId,
      category,
      name: datasetName,
      zipPath: normalizedRel,
      dataPath,
      itemCount: normalizedItems.length,
      size: info.size,
      updatedAt: new Date(info.mtimeMs).toISOString(),
    },
    aggregateItems: normalizedItems.map((item) => ({
      ...item,
      datasetId,
      datasetName,
      category,
    })),
  }
}

async function writeManifest(outputRoot, records, categories) {
  const manifestPath = path.join(outputRoot, MANIFEST_NAME)
  const payload = {
    generatedAt: new Date().toISOString(),
    sourceRoot: 'src/assets',
    count: records.length,
    items: records,
    categories,
  }

  await writeFile(manifestPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  return manifestPath
}

async function cleanOutputDir(outputRoot) {
  await rm(outputRoot, { recursive: true, force: true })
  await ensureDirectory(outputRoot)
  await writeFile(path.join(outputRoot, '.gitignore'), '# Generated output\n*\n!.gitignore\n', 'utf8')
}

async function main() {
  await ensureDirectory(OUTPUT_ROOT)

  const allFiles = await walk(SOURCE_ROOT)
  const zipFiles = allFiles.filter((filePath) => filePath.toLowerCase().endsWith('.zip'))

  await cleanOutputDir(OUTPUT_ROOT)

  const generated = []
  const categoryBuckets = new Map()

  function pushToCategoryBucket(topCategory, subCategory, item) {
    const key = `${topCategory}::${subCategory ?? ''}`
    if (!categoryBuckets.has(key)) {
      categoryBuckets.set(key, {
        topCategory,
        subCategory,
        items: [],
        datasets: new Map(),
      })
    }

    const bucket = categoryBuckets.get(key)
    bucket.items.push(item)
    bucket.datasets.set(item.datasetId, {
      id: item.datasetId,
      name: item.datasetName,
      category: item.category,
    })
  }

  for (const zipFile of zipFiles) {
    const parsed = await unzipDataset(zipFile, SOURCE_ROOT)
    generated.push(parsed.manifest)

    const categoryParts = parsed.manifest.category ? parsed.manifest.category.split('/') : ['未分类']
    const topCategory = categoryParts[0] || '未分类'
    const subCategory = categoryParts.slice(1).join('/') || null

    for (const item of parsed.aggregateItems) {
      pushToCategoryBucket(topCategory, null, item)
      if (subCategory) {
        pushToCategoryBucket(topCategory, subCategory, item)
      }
    }
  }

  generated.sort((a, b) => a.zipPath.localeCompare(b.zipPath, 'zh-Hans-CN'))

  const categoryEntries = []
  for (const bucket of categoryBuckets.values()) {
    const categoryId = buildCategoryId(bucket.topCategory, bucket.subCategory)
    const categoryDataPath = await writeCategoryJson(categoryId, {
      categoryId,
      topCategory: bucket.topCategory,
      subCategory: bucket.subCategory,
      datasets: [...bucket.datasets.values()],
      items: bucket.items,
    })

    categoryEntries.push({
      id: categoryId,
      topCategory: bucket.topCategory,
      subCategory: bucket.subCategory,
      dataPath: categoryDataPath,
      itemCount: bucket.items.length,
      datasetCount: bucket.datasets.size,
    })
  }

  categoryEntries.sort((a, b) => {
    const topComp = a.topCategory.localeCompare(b.topCategory, 'zh-Hans-CN')
    if (topComp !== 0) {
      return topComp
    }

    return (a.subCategory ?? '').localeCompare(b.subCategory ?? '', 'zh-Hans-CN')
  })

  const manifestPath = await writeManifest(OUTPUT_ROOT, generated, categoryEntries)

  process.stdout.write(
    `Prepared ${generated.length} dataset(s).\nOutput: ${path.relative(projectRoot, OUTPUT_ROOT)}\nManifest: ${path.relative(projectRoot, manifestPath)}\n`,
  )
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`)
  process.exitCode = 1
})
