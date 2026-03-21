import { hooks as schemaHooks } from '@feathersjs/schema'
import { hooks as authHooks } from '@feathersjs/authentication'
import { hooks as localHooks } from '@feathersjs/authentication-local'
import type { Application } from '../../declarations'
import { UserService, getOptions } from './users.class'
import {
  userExternalResolver,
  userPatchResolver,
  userPatchValidator,
  userQueryResolver,
  userQueryValidator,
  userResolver,
  userDataResolver,
  userDataValidator
} from './users.schema'

export const users = (app: Application) => {
  // Register our service on the Atlas MongoDB
  app.use('users', new UserService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: ['find', 'get', 'create', 'patch', 'remove'],
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service('users').hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(userExternalResolver)
      ],
      find: [authHooks.authenticate('jwt')],
      get: [authHooks.authenticate('jwt')],
      create: [],
      patch: [authHooks.authenticate('jwt')],
      remove: [authHooks.authenticate('jwt')]
    },
    before: {
      all: [],
      find: [userQueryValidator],
      get: [
        async (context) => {
          if (context.id === 'me' && context.params.user) {
            context.id = context.params.user._id as any
          }
        }
      ],
      create: [schemaHooks.resolveData(userDataResolver), userDataValidator, localHooks.hashPassword('password')],
      patch: [schemaHooks.resolveData(userPatchResolver), userPatchValidator, localHooks.hashPassword('password')],
      remove: []
    },
    after: {
      all: [],
      get: [
        async (context: any) => {
          // Populate videos for this user
          const result = context.result as any
          if (result && result._id) {
            const videos = await context.app.service('videos').find({
              query: { userId: result._id },
              paginate: false
            })
            result.videos = videos
          }
        }
      ]
    },
    error: {
      all: []
    }
  })

  // Ensure unique index for phoneNumber
  app.get('mongodbClient').then((db) => {
    db.collection('users').createIndex({ phoneNumber: 1 }, { unique: true }).catch(err => {
      console.warn('Warning: Could not create unique index on users.phoneNumber', err.message)
    })
  })
}

// Add user service to the service type list
declare module '../../declarations' {
  interface ServiceTypes {
    users: UserService
  }
}
