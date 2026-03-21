import { hooks as schemaHooks } from '@feathersjs/schema'
import type { Application } from '../../declarations'
import { TokenService, getOptions } from './tokens.class'
import {
  tokenExternalResolver,
  tokenPatchResolver,
  tokenPatchValidator,
  tokenQueryResolver,
  tokenQueryValidator,
  tokenResolver,
  tokenDataResolver,
  tokenDataValidator
} from './tokens.schema'

export const tokens = (app: Application) => {
  const tokenService = new TokenService(getOptions(app))
  app.use('tokens', tokenService, {
    methods: ['find', 'get', 'create', 'patch', 'remove'],
    events: []
  })

  app.service('tokens').hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(tokenExternalResolver)
      ]
    },
    before: {
      all: [schemaHooks.resolveData(tokenResolver)],
      find: [tokenQueryValidator, tokenQueryResolver as any],
      get: [tokenQueryValidator, tokenQueryResolver as any],
      create: [tokenDataValidator, tokenDataResolver as any],
      patch: [tokenPatchValidator, tokenPatchResolver as any],
      remove: []
    }
  })
}

declare module '../../declarations' {
  interface ServiceTypes {
    tokens: TokenService
  }
}
