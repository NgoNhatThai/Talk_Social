import { AuthenticationService, JWTStrategy } from '@feathersjs/authentication'
import { LocalStrategy } from '@feathersjs/authentication-local'
import type { Application } from './declarations'

declare module './declarations' {
  interface ServiceTypes {
    authentication: AuthenticationService
  }
}

export const authentication = (app: Application) => {
  const authService = new AuthenticationService(app)

  authService.register('jwt', new JWTStrategy())
  authService.register('local', new LocalStrategy())

  app.use('authentication', authService)
}
