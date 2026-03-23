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
        friendRequestDataValidator
      ],
      patch: [
        schemaHooks.resolveData(friendRequestPatchResolver),
        friendRequestPatchValidator,
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
          if (result?.status === 'accepted') {
             // Create a chat room for these two users
             await context.app.service('rooms').create({
               participantIds: [result.fromUserId, result.toUserId],
               type: 'direct'
             })
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
