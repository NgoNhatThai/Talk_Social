import { hooks as authHooks } from '@feathersjs/authentication'
import { hooks as schemaHooks } from '@feathersjs/schema'
import { ObjectId } from 'mongodb'
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
        // messageQueryValidator,
        schemaHooks.resolveQuery(messageQueryResolver),
        async (context: any) => {
          console.log('Message find hook triggered', context.params.query)
          // Users should only see messages in rooms they are part of
          const roomId = context.params.query?.roomId
          if (roomId) {
            const castRoomId = typeof roomId === 'string' ? new ObjectId(roomId) : roomId
            context.params.query.roomId = castRoomId
            
            console.log(`[DEBUG find] Checking room ${castRoomId} permissions for user ${context.params.user?._id}`)
            // Use _get to bypass broken rooms hooks that cause infinite recursion
            // Clear query to avoid filtering the room record by the message roomId
            const room = await (context.app.service('rooms') as any)._get(castRoomId, {
              ...context.params,
              query: {}
            })
            console.log(`[DEBUG find] Room found: ${!!room}, participantIds: ${room?.participantIds?.length}`)
            const isParticipant = room.participantIds.some((id: any) => id.toString() === context.params.user?._id.toString())
            console.log(`[DEBUG find] User ${context.params.user?._id} participant: ${isParticipant}`)
            if (!isParticipant) {
              throw new Error('Not authorized to see messages in this room')
            }
          }
        }
      ],
      get: [// messageQueryValidator, 
        schemaHooks.resolveQuery(messageQueryResolver)],
      create: [
        // messageDataValidator,
        schemaHooks.resolveData(messageDataResolver),
        async (context: any) => {
          if (context.data.roomId && typeof context.data.roomId === 'string') {
            context.data.roomId = new ObjectId(context.data.roomId)
          }
          
          console.log(`[DEBUG create] Checking room ${context.data.roomId} permissions for user ${context.params.user?._id}`)
          // Use _get to bypass broken rooms hooks that cause infinite recursion
          const room = await (context.app.service('rooms') as any)._get(context.data.roomId, context.params)
          console.log(`[DEBUG create] Room found: ${!!room}, participantIds: ${room?.participantIds?.length}`)
          const isParticipant = room.participantIds.some((id: any) => id.toString() === context.params.user?._id.toString())
          console.log(`[DEBUG create] User ${context.params.user?._id} participant: ${isParticipant}`)
          if (!isParticipant) {
            throw new Error('Not authorized to send messages to this room')
          }
        }
      ],
      patch: [
        // messagePatchValidator,
        schemaHooks.resolveData(messagePatchResolver),
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
          // Use _patch to avoid any hook issues in rooms service
          await (context.app.service('rooms') as any)._patch(result.roomId, {
            lastMessageId: result._id
          }, context.params)
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
