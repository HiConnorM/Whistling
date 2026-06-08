import { db } from '@whistling/db'
import { parseServerEnv } from '@whistling/config'

// Validate required env vars at startup — fails fast before connecting to Redis/DB
parseServerEnv(process.env)
import { startIngestionWorker } from './workers/ingestion.js'
import { startAnalysisWorker } from './workers/analysis.js'
import { startClusteringWorker } from './workers/clustering.js'
import { startIntelligenceWorker } from './workers/intelligence.js'
import { startReportingWorker } from './workers/reporting.js'
import { startNotificationWorker } from './workers/notifications.js'

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379'
const CONCURRENCY = parseInt(process.env['WORKER_CONCURRENCY'] ?? '5', 10)

async function main() {
  console.log('Starting Whistling.io workers...')

  const connection = { url: REDIS_URL }

  const workers = [
    startIngestionWorker(db, connection, CONCURRENCY),
    startAnalysisWorker(db, connection, CONCURRENCY),
    startClusteringWorker(db, connection, 2),
    startIntelligenceWorker(db, connection, 2),
    startReportingWorker(db, connection, 2),
    startNotificationWorker(db, connection, 5),
  ]

  console.log(`All workers started (concurrency: ${CONCURRENCY})`)

  const shutdown = async () => {
    console.log('Shutting down workers...')
    await Promise.all(workers.map((w) => w.close()))
    await db.$disconnect()
    process.exit(0)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch((err) => {
  console.error('Worker failed to start:', err)
  process.exit(1)
})
