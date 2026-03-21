import { Application } from '../../declarations'
import { HealthService } from './health.class'

export const health = (app: Application) => {
  // Register our service on the Feathers application
  app.use('health', new HealthService(app), {
    // A list of all methods this service exposes
    methods: ['find']
  })

  // Initialize hooks: ensure it's accessible without auth
  app.service('health').hooks({
    around: {
      all: [] // No auth required for health check
    },
    before: {},
    after: {},
    error: {}
  })
}

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    'health': HealthService
  }
}
