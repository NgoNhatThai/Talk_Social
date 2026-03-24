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
          
          // Only force participantIds if not already specified or if it's an external provider call
          if (context.params.provider && !context.params.query.participantIds) {
            context.params.query.participantIds = context.params.user?._id.toString()
          }
          
          // Default sorting: most recent lastMessageAt first
          if (!context.params.query.$sort) {
            context.params.query.$sort = { lastMessageAt: -1 }
          }
        }
      ],
      get: [
        // roomQueryValidator,
        schemaHooks.resolveQuery(roomQueryResolver),
        async (context: any) => {
          // Ensure the user is a participant of the room they are trying to get
          // Use _get to bypass hooks to avoid infinite recursion
          const room = await (context.service as any)._get(context.id as string, context.params)
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
      create: [],
      find: [
        async (context: any) => {
          const { result } = context
          const rooms = result.data || result
          
          if (!Array.isArray(rooms)) return context

          const populateData = async (room: any) => {
             // 1. Populate last message details
             if (room.lastMessageId) {
                try {
                   const message = await context.app.service('messages').get(room.lastMessageId, {
                      ...context.params,
                      provider: undefined
                   })
                   room.lastMessage = message
                   room.lastMessageContent = message.text
                   room.lastMessageSenderId = message.senderId
                   room.lastMessageReadBy = message.readBy
                } catch (err) {
                   // Last message might be deleted or not found
                }
             }

             // 2. Populate dynamic room name (and avatar) for direct chats
             if (room.type === 'direct' && Array.isArray(room.participantIds)) {
                const currentUserId = context.params.user?._id?.toString()
                const otherUserIdRaw = room.participantIds.find((id: any) => id.toString() !== currentUserId)
                
                if (otherUserIdRaw) {
                   try {
                      // Import inside or ensure ObjectId is available globally
                      const { ObjectId } = require('mongodb')
                      const otherUserId = typeof otherUserIdRaw === 'string' ? new ObjectId(otherUserIdRaw) : otherUserIdRaw
                      
                      const otherUser = await (context.app.service('users') as any)._get(otherUserId)
                      room.name = otherUser?.username || otherUser?.phoneNumber || 'Unknown'
                      if (otherUser?.avatar) {
                         room.avatar = otherUser.avatar
                      }
                   } catch (err: any) {
                      // Do not log Not Found errors as they are expected if a user is deleted
                   }
                }
             }
             return room
          }

          if (result.data) {
             result.data = await Promise.all(result.data.map(populateData))
          } else {
             context.result = await Promise.all(result.map(populateData))
          }
        }
      ],
      get: [
        async (context: any) => {
          const room = context.result as any
          if (room.lastMessageId) {
             try {
                const message = await context.app.service('messages').get(room.lastMessageId, {
                   ...context.params,
                   provider: undefined
                })
                room.lastMessage = message
                room.lastMessageContent = message.text
                room.lastMessageSenderId = message.senderId
                room.lastMessageReadBy = message.readBy
             } catch (err) {}
          }
          if (room.type === 'direct' && Array.isArray(room.participantIds)) {
             const currentUserId = context.params.user?._id?.toString()
             const otherUserIdRaw = room.participantIds.find((id: any) => id.toString() !== currentUserId)
             
             if (otherUserIdRaw) {
                try {
                   const { ObjectId } = require('mongodb')
                   const otherUserId = typeof otherUserIdRaw === 'string' ? new ObjectId(otherUserIdRaw) : otherUserIdRaw
                   
                   const otherUser = await (context.app.service('users') as any)._get(otherUserId)
                   room.name = otherUser?.username || otherUser?.phoneNumber || 'Unknown'
                   if (otherUser?.avatar) {
                      room.avatar = otherUser.avatar
                   }
                } catch (err: any) {
                   // Do not log Not Found errors as they are expected if a user is deleted
                }
             }
          }
        }
      ],
      patch: [
        async (context: any) => {
          const room = context.result as any
          console.log(`[DEBUG rooms] After patch: room ${room._id}, populating last message`)
          if (room.lastMessageId) {
             try {
                const message = await context.app.service('messages').get(room.lastMessageId, {
                   ...context.params,
                   provider: undefined
                })
                room.lastMessage = message
                room.lastMessageContent = message.text
                room.lastMessageSenderId = message.senderId
                room.lastMessageReadBy = message.readBy
             } catch (err) {}
          }
        }
      ]
    }
  })
}

declare module '../../declarations' {
  interface ServiceTypes {
    rooms: RoomService
  }
}
