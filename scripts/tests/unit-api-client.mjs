import fs from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const apiPath = path.join(projectRoot, 'src', 'lib', 'api.ts')
const apiContent = fs.readFileSync(apiPath, 'utf8')

const requiredSnippets = [
  "import { API_BASE_URL } from './config/env'",
  'async getNotifications()',
  'async markNotificationAsRead(notificationId: string)',
  'async markAllNotificationsAsRead()',
  'async startBrowserSession(payload: { accountId: number; proxyConfig?: any })',
  'async getBrowserSessionStatus(accountId: number)',
]

const missing = requiredSnippets.filter((snippet) => !apiContent.includes(snippet))

if (missing.length > 0) {
  console.error('Unit API checks failed. Missing snippets:')
  for (const snippet of missing) {
    console.error(`- ${snippet}`)
  }
  process.exit(1)
}

console.log('Unit API checks passed')
