import { hooks as authHooks } from '@feathersjs/authentication'
import { hooks as schemaHooks } from '@feathersjs/schema'
import type { Application } from '../../declarations'
import { RoomService, getOptions } from './rooms.class'
import {
  roomExternalResolver,
  roomPatchResolver,
  roomPatchValidator,
  roomQueryResolver,
  roomQueryValidator,
  roomResolver,
  roomDataResolver,
  roomDataValidator
} from './rooms.schema'

export const rooms = (app: Application) => {
  app.use('rooms', new RoomService(getOptions(app)), {
    methods: ['find', 'get', 'create', 'patch', 'remove'],
    events: []
  })

  app.service('rooms').hooks({
    around: {
      all: [
        authHooks.authenticate('jwt'),
        schemaHooks.resolveExternal(roomExternalResolver),
        schemaHooks.resolveData(roomResolver)
      ]
    },
    before: {
      all: [],
      find: [
        // roomQueryValidator,
        schemaHooks.resolveQuery(roomQueryResolver),
        async (context: any) => {
          // Users should only see rooms they are part of
          if (!context.params.query) context.params.query = {}
          context.params.query.participantIds = context.params.user?._id.toString()
        }
      ],
      get: [
        // roomQueryValidator,
        schemaHooks.resolveQuery(roomQueryResolver),
        async (context: any) => {
          // Ensure the user is a participant of the room they are trying to get
          const room = await context.service.get(context.id as string)
          const isParticipant = (room as any).participantIds.some((id: any) => id.toString() === context.params.user?._id.toString())
          if (!isParticipant) {
             throw new Error('Not authorized to access this room')
          }
        }
      ],
      create: [
        // roomDataValidator,
        schemaHooks.resolveData(roomDataResolver)
      ],
      patch: [
        // roomPatchValidator,
        schemaHooks.resolveData(roomPatchResolver)
      ],
      remove: []
    },
    after: {
      create: [
        
      ]
    }
  })
}

declare module '../../declarations' {
  interface ServiceTypes {
    rooms: RoomService
  }
}
