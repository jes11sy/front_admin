import fs from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()

const clientLayoutPath = path.join(projectRoot, 'src', 'app', 'client-layout.tsx')
const clientLayout = fs.readFileSync(clientLayoutPath, 'utf8')

const checks = [
  {
    ok: clientLayout.includes("import AuthGuard from '@/components/auth-guard'"),
    message: 'Client layout must import AuthGuard',
  },
  {
    ok: clientLayout.includes('<AuthGuard>') && clientLayout.includes('</AuthGuard>'),
    message: 'Private content must be wrapped by AuthGuard',
  },
  {
    ok: !clientLayout.includes('bypass авторизации'),
    message: 'Bypass auth markers must be removed from client layout',
  },
]

const failed = checks.filter((item) => !item.ok)
if (failed.length > 0) {
  console.error('Integration auth-guard checks failed:')
  for (const item of failed) {
    console.error(`- ${item.message}`)
  }
  process.exit(1)
}

console.log('Integration auth-guard checks passed')
