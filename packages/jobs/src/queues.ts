import { Queue, QueueEvents } from 'bullmq'
import type { ConnectionOptions } from 'bullmq'

export type QueueName =
  | 'ingestion'
  | 'analysis'
  | 'clustering'
  | 'intelligence'
  | 'reporting'
  | 'notifications'

export const QUEUE_NAMES: Record<QueueName, QueueName> = {
  ingestion: 'ingestion',
  analysis: 'analysis',
  clustering: 'clustering',
  intelligence: 'intelligence',
  reporting: 'reporting',
  notifications: 'notifications',
}

const queues = new Map<QueueName, Queue>()

export function getQueue(name: QueueName, connection: ConnectionOptions): Queue {
  const existing = queues.get(name)
  if (existing) return existing

  const queue = new Queue(name, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 500, age: 86400 },
      removeOnFail: { count: 100, age: 604800 },
    },
  })

  queues.set(name, queue)
  return queue
}

export function getQueueEvents(name: QueueName, connection: ConnectionOptions): QueueEvents {
  return new QueueEvents(name, { connection })
}
