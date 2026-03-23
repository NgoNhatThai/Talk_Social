// For more information about this file see https://dove.feathersjs.com/guides/cli/logging.html
import { createLogger, format, transports } from 'winston'

// Configure the Winston logger. For the complete documentation see https://github.com/winstonjs/winston
export const logger = createLogger({
  // To see more detailed errors, change this to 'debug'
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.colorize(),
    format.splat(),
    format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? '\n' + JSON.stringify(meta, null, 2) : ''
      return `[${timestamp}] ${level}: ${message}${metaStr}`
    })
  ),
  transports: [new transports.Console()]
})
