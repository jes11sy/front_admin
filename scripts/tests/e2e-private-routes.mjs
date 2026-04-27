import fs from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const middlewarePath = path.join(projectRoot, 'middleware.ts')

if (!fs.existsSync(middlewarePath)) {
  console.error('E2E private-routes check failed: middleware.ts is missing')
  process.exit(1)
}

const middleware = fs.readFileSync(middlewarePath, 'utf8')
const requiredChecks = [
  {
    ok: middleware.includes("const PUBLIC_ROUTES = new Set(['/login', '/logout'])"),
    message: 'Public routes list must include /login and /logout',
  },
  {
    ok: middleware.includes("loginUrl.searchParams.set('redirect', pathname)"),
    message: 'Unauthorized redirect must preserve target pathname',
  },
  {
    ok: middleware.includes("matcher: ["),
    message: 'Middleware matcher must be configured',
  },
]

const failed = requiredChecks.filter((item) => !item.ok)
if (failed.length > 0) {
  console.error('E2E private-routes checks failed:')
  for (const item of failed) {
    console.error(`- ${item.message}`)
  }
  process.exit(1)
}

console.log('E2E private-routes checks passed')
