import { users } from './users/users'
import { health } from './health/health'
import type { Application } from '../declarations'

export const services = (app: Application) => {
  app.configure(users)
  app.configure(health)
}
