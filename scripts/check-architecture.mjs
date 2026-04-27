import fs from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const srcRoot = path.join(projectRoot, 'src')

const allowedFetchFiles = new Set([
  path.join(srcRoot, 'lib', 'api.ts'),
  path.join(srcRoot, 'lib', 'fetch-with-retry.ts'),
])

const ignoredDirs = new Set(['.next', 'node_modules', '.git'])
const targetExtensions = new Set(['.ts', '.tsx'])

const failures = []

function walk(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        walk(fullPath)
      }
      continue
    }

    if (!targetExtensions.has(path.extname(entry.name))) continue

    const content = fs.readFileSync(fullPath, 'utf8')
    if (/\bfetch\s*\(/.test(content) && !allowedFetchFiles.has(fullPath)) {
      failures.push(`Direct fetch is forbidden outside API core: ${path.relative(projectRoot, fullPath)}`)
    }
  }
}

walk(srcRoot)

const layoutPath = path.join(srcRoot, 'app', 'client-layout.tsx')
const layoutContent = fs.readFileSync(layoutPath, 'utf8')
if (!layoutContent.includes('<AuthGuard>')) {
  failures.push('AuthGuard must wrap private routes in src/app/client-layout.tsx')
}

const nextConfigPath = path.join(projectRoot, 'next.config.js')
const nextConfig = fs.readFileSync(nextConfigPath, 'utf8')
if (/ignoreBuildErrors:\s*true/.test(nextConfig)) {
  failures.push('next.config.js must not set typescript.ignoreBuildErrors=true')
}

const legacyNavigationPath = path.join(srcRoot, 'components', 'navigation.tsx')
if (fs.existsSync(legacyNavigationPath)) {
  failures.push('Legacy src/components/navigation.tsx should be removed to keep one navigation source of truth')
}

if (failures.length > 0) {
  console.error('Architecture checks failed:\n')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Architecture checks passed')
