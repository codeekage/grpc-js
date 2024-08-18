import { GrpcLogger } from './interface'
import pino from 'pino'


export const createLogger = (args: Record<string, unknown>): GrpcLogger => pino({
  formatters: {
    bindings: (bindings) => ({
      pid: bindings.pid,
      host: bindings.hostname,
      ...args,
    })
  }
})

