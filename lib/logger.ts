import fs from 'node:fs'
import path from 'node:path'
import { resolveDbPath } from '@/lib/db'

function resolveLogFilePath(): string {
  const dbPath = resolveDbPath()
  const dir = dbPath === ':memory:' ? path.join(process.cwd(), 'data') : path.dirname(dbPath)
  return path.join(dir, 'microstory.log')
}

function write(level: 'INFO' | 'WARN' | 'ERROR', message: string, error?: unknown): void {
  const logFilePath = resolveLogFilePath()
  fs.mkdirSync(path.dirname(logFilePath), { recursive: true })
  const errorSuffix = error !== undefined ? ` ${error instanceof Error ? (error.stack ?? error.message) : String(error)}` : ''
  const line = `${new Date().toISOString()} [${level}] ${message}${errorSuffix}\n`
  fs.appendFileSync(logFilePath, line)
}

export function logInfo(message: string): void {
  write('INFO', message)
}

export function logWarn(message: string, error?: unknown): void {
  write('WARN', message, error)
}

export function logError(message: string, error?: unknown): void {
  write('ERROR', message, error)
}
