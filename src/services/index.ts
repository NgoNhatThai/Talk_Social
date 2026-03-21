import { health } from './health/health'
import type { Application } from '../declarations'

export const services = (app: Application) => {
  app.configure(health)
}
