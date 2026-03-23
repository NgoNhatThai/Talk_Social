import { hooks as authHooks } from '@feathersjs/authentication'
import { hooks as schemaHooks } from '@feathersjs/schema'
import type { Application } from '../../declarations'
import { FriendRequestService, getOptions } from './friend-requests.class'
import {
  friendRequestExternalResolver,
  friendRequestPatchResolver,
  friendRequestPatchValidator,
  friendRequestQueryResolver,
  friendRequestQueryValidator,
  friendRequestResolver,
  friendRequestDataResolver,
  friendRequestDataValidator
} from './friend-requests.schema'

export const friendRequests = (app: Application) => {
  app.use('friend-requests', new FriendRequestService(getOptions(app)), {
    methods: ['find', 'get', 'create', 'patch', 'remove'],
    events: []
  })

  app.service('friend-requests').hooks({
    around: {
      all: [
        authHooks.authenticate('jwt'),
        schemaHooks.resolveExternal(friendRequestExternalResolver),
        schemaHooks.resolveData(friendRequestResolver)
      ]
    },
    before: {
      all: [],
      find: [
        // friendRequestQueryValidator,
        schemaHooks.resolveQuery(friendRequestQueryResolver)
      ],
      get: [
        // friendRequestQueryValidator,
        schemaHooks.resolveQuery(friendRequestQueryResolver)
      ],
      create: [
        schemaHooks.resolveData(friendRequestDataResolver),
        // friendRequestDataValidator 
      ],
      patch: [
        schemaHooks.resolveData(friendRequestPatchResolver),
        // friendRequestPatchValidator,
        async (context: any) => {
          // Only the receiver can accept/reject the request
          const request = await context.service.get(context.id as string)
          if (request.toUserId.toString() !== context.params.user?._id.toString()) {
            throw new Error('Not authorized to accept this friend request')
          }
        }
      ],
      remove: []
    },
    after: {
      patch: [
        async (context: any) => {
          const result = context.result as any
          
          // UnWrap if needed due to global wrapResult
          const data = result.status && result.data ? result.data : result
          const status = data.status || result.status

          if (status === 'accepted') {
            
            // Get the full record if fields are missing
            const fullRecord = (data.fromUserId && data.toUserId) ? data : await context.service.get(context.id)
            
            
            const fromUserId = fullRecord.fromUserId?.toString() || fullRecord.fromUserId
            const toUserId = fullRecord.toUserId?.toString() || fullRecord.toUserId
            
            if (!fromUserId || !toUserId) {
              console.error('[ERROR] Could not determine user IDs for room creation')
              return
            }

            try {
              const newRoom = await context.app.service('rooms').create({
                participantIds: [fromUserId, toUserId],
                type: 'direct'
              })
            } catch (roomErr: any) {
              console.error('[ERROR] Failed to create room:', roomErr.message)
            }
          }
        }
      ]
    }
  })
}

declare module '../../declarations' {
  interface ServiceTypes {
    'friend-requests': FriendRequestService
  }
}
