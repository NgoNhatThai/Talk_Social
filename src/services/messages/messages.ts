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
        schemaHooks.resolveExternal(messageExternalResolver)
      ]
    },
    before: {
      all: [],
      find: [
        // messageQueryValidator,
        schemaHooks.resolveQuery(messageQueryResolver),
        async (context: any) => {
          // Users should only see messages in rooms they are part of
          const roomId = context.params.query?.roomId
          if (roomId) {
            const castRoomId = typeof roomId === 'string' ? new ObjectId(roomId) : roomId
            context.params.query.roomId = castRoomId
            
            // Use _get to bypass broken rooms hooks that cause infinite recursion
            // Clear query to avoid filtering the room record by the message roomId
            const room = await (context.app.service('rooms') as any)._get(castRoomId, {
              ...context.params,
              query: {}
            })
            const isParticipant = room.participantIds.some((id: any) => id.toString() === context.params.user?._id.toString())
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
          
          // Use _get to bypass broken rooms hooks that cause infinite recursion
          const room = await (context.app.service('rooms') as any)._get(context.data.roomId, context.params)
          const isParticipant = room.participantIds.some((id: any) => id.toString() === context.params.user?._id.toString())
          if (!isParticipant) {
            throw new Error('Not authorized to send messages to this room')
          }
        }
      ],
      patch: [
        // messagePatchValidator,
        schemaHooks.resolveData(messagePatchResolver),
        async (context: any) => {
          // If isSeen is true, add current user to readBy array
          if (context.data && (context.data.isSeen || context.data.readBy)) {
             const message = await context.service.get(context.id as string)
             const readBy = new Set(message.readBy.map((id: any) => id.toString()))
             readBy.add(context.params.user?._id.toString())
             context.data.readBy = Array.from(readBy)
             // Remove isSeen from data before it hits the database
             delete context.data.isSeen
             console.log(`[DEBUG messages] Before patch: user ${context.params.user?._id} is marking message ${context.id} as read`)
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
          // Use .patch to ensure hooks are run and events are emitted
          await context.app.service('rooms').patch(result.roomId, {
            lastMessageId: result._id,
            lastMessageAt: result.createdAt || new Date().toISOString(),
            lastMessageContent: result.text,
            lastMessageSenderId: result.senderId,
            lastMessageReadBy: result.readBy
          }, {
            ...context.params,
            provider: undefined // Ensure internal call but trigger events
          })
          
          // Note: Feathers automatically emits the 'created' event after this hook finishes.
          // The event and payload are broadcast to the channels defined in src/channels.ts
        }
      ],
      patch: [
        async (context: any) => {
           // Sync readBy to room if this is the last message
           const result = context.result as any
           
           console.log(`[DEBUG messages] After patch message: ${result._id}, room: ${result.roomId}`)
           
           try {
              const room = await (context.app.service('rooms') as any)._get(result.roomId, {
                 ...context.params,
                 provider: undefined
              })
              
              console.log(`[DEBUG messages] Room ${result.roomId} lastMessageId: ${room.lastMessageId}, current message: ${result._id}`)
              
              if (room.lastMessageId?.toString() === result._id.toString()) {
                 console.log(`[DEBUG messages] Syncing readBy to room ${result.roomId} with ${result.readBy?.length || 0} readers`)
                 await (context.app.service('rooms') as any).patch(result.roomId, {
                   lastMessageReadBy: result.readBy
                 }, {
                   ...context.params,
                   provider: undefined
                 })
              }
           } catch (err) {
              console.error(`[DEBUG messages] Error during room sync: ${err}`)
           }
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
