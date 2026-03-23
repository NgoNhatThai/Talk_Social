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
        schemaHooks.resolveExternal(tokenExternalResolver),
        schemaHooks.resolveResult(tokenResolver)
      ]
    },
    before: {
      all: [],
      find: [// tokenQueryValidator, 
        schemaHooks.resolveQuery(tokenQueryResolver)],
      get: [// tokenQueryValidator, 
        schemaHooks.resolveQuery(tokenQueryResolver)],
      create: [
        schemaHooks.resolveData(tokenDataResolver),
        // tokenDataValidator
      ],
      patch: [
        // tokenPatchValidator, 
        schemaHooks.resolveData(tokenPatchResolver)],
      remove: []
    }
  })
}

declare module '../../declarations' {
  interface ServiceTypes {
    tokens: TokenService
  }
}
