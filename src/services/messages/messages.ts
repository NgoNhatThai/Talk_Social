import { hooks as authHooks } from '@feathersjs/authentication'
import { hooks as schemaHooks } from '@feathersjs/schema'
import type { Application } from '../../declarations'
import { MessageService, getOptions } from './messages.class'
import {
  messageExternalResolver,
  messagePatchResolver,
  messagePatchValidator,
  messageQueryResolver,
  messageQueryValidator,
  messageResolver,
  messageDataResolver,
  messageDataValidator
} from './messages.schema'

export const messages = (app: Application) => {
  app.use('messages', new MessageService(getOptions(app)), {
    methods: ['find', 'get', 'create', 'patch', 'remove', 'typing', 'stopTyping'],
    events: ['typing', 'stopTyping']
  })

  app.service('messages').hooks({
    around: {
      all: [
        authHooks.authenticate('jwt'),
        schemaHooks.resolveExternal(messageExternalResolver),
        schemaHooks.resolveData(messageResolver)
      ]
    },
    before: {
      all: [],
      find: [
        messageQueryValidator,
        messageQueryResolver as any,
        async (context: any) => {
          // Users should only see messages in rooms they are part of
          const roomId = context.params.query?.roomId
          if (roomId) {
            const room = await context.app.service('rooms').get(roomId)
            const isParticipant = room.participantIds.some((id: any) => id.toString() === context.params.user?._id.toString())
            if (!isParticipant) {
              throw new Error('Not authorized to see messages in this room')
            }
          }
        }
      ],
      get: [messageQueryValidator, messageQueryResolver as any],
      create: [
        messageDataValidator,
        messageDataResolver as any,
        async (context: any) => {
          // Validate user belongs to the room they are sending to
          const room = await context.app.service('rooms').get(context.data.roomId)
          const isParticipant = room.participantIds.some((id: any) => id.toString() === context.params.user?._id.toString())
          if (!isParticipant) {
            throw new Error('Not authorized to send messages to this room')
          }
        }
      ],
      patch: [
        messagePatchValidator,
        messagePatchResolver as any,
        async (context: any) => {
          // Add current user to readBy array if 'seen' behavior
          if (context.data && context.data.readBy) {
             const message = await context.service.get(context.id as string)
             const readBy = new Set(message.readBy.map((id: any) => id.toString()))
             readBy.add(context.params.user?._id.toString())
             context.data.readBy = Array.from(readBy)
          }
        }
      ],
      remove: []
    },
    after: {
      create: [
        async (context: any) => {
          // Update lastMessageId in the room for quick listing
          const result = context.result as any
          await context.app.service('rooms').patch(result.roomId, {
            lastMessageId: result._id
          })
        }
      ]
    }
  })
}

declare module '../../declarations' {
  interface ServiceTypes {
    messages: MessageService
  }
}
