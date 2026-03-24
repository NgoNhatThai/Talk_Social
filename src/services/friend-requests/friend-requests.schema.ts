import { Type, getValidator, querySyntax, ObjectIdSchema } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'
import { dataValidator, queryValidator } from '../../validators'
import type { HookContext } from '../../declarations'
import { resolve } from '@feathersjs/schema'

// Main data model schema
export const friendRequestSchema = Type.Object(
  {
    _id: ObjectIdSchema(),
    fromUserId: ObjectIdSchema(),
    toUserId: ObjectIdSchema(),
    status: Type.Enum({
      pending: 'pending',
      accepted: 'accepted',
      rejected: 'rejected'
    }),
    fromUser: Type.Optional(Type.Any())
  },
  { $id: 'FriendRequest', additionalProperties: false }
)
export type FriendRequest = Static<typeof friendRequestSchema>
export const friendRequestValidator = getValidator(friendRequestSchema, dataValidator)
export const friendRequestResolver = resolve<FriendRequest, HookContext>({
  properties: {
    fromUser: async (_value, data, context) => {
      if (data.fromUserId) {
        try {
          return await context.app.service('users').get(data.fromUserId as any)
        } catch (err) {
          return undefined
        }
      }
    }
  }
})

export const friendRequestExternalResolver = resolve<FriendRequest, HookContext>({})

// Schema for creating new entries
export const friendRequestDataSchema = Type.Intersect([
  Type.Pick(friendRequestSchema, ['toUserId']),
  Type.Partial(Type.Pick(friendRequestSchema, ['fromUserId', 'status'])),
  Type.Object({
    phoneNumber: Type.Optional(Type.String())
  })
], {
  $id: 'FriendRequestData'
})
export type FriendRequestData = Static<typeof friendRequestDataSchema>
export const friendRequestDataValidator = getValidator(friendRequestDataSchema, dataValidator)
export const friendRequestDataResolver = resolve<FriendRequestData, HookContext>({
  properties: {
    fromUserId: async (_value: any, _data: any, context: any) => context.params.user?._id,
    status: async () => 'pending',
    toUserId: async (value: any, data: any, context: any) => {
       if (value) return value
       if (data.phoneNumber) {
         const users = await context.app.service('users').find({
            query: { phoneNumber: data.phoneNumber, $limit: 1 },
            paginate: false
         }) as any
         const user = users[0]
         if (!user) throw new Error('User not found with this phone number')
         return user._id
       }
       return value
    }
  }
})

// Schema for updating existing entries
export const friendRequestPatchSchema = Type.Partial(
  Type.Pick(friendRequestSchema, ['status']),
  { $id: 'FriendRequestPatch' }
)
export type FriendRequestPatch = Static<typeof friendRequestPatchSchema>
export const friendRequestPatchValidator = getValidator(friendRequestPatchSchema, dataValidator)
export const friendRequestPatchResolver = resolve<FriendRequestPatch, HookContext>({})

// Schema for allowed query properties
export const friendRequestQueryProperties = Type.Pick(friendRequestSchema, ['_id', 'fromUserId', 'toUserId', 'status'])
export const friendRequestQuerySchema = Type.Intersect(
  [
    querySyntax(friendRequestQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type FriendRequestQuery = Static<typeof friendRequestQuerySchema>
export const friendRequestQueryValidator = getValidator(friendRequestQuerySchema, queryValidator)
export const friendRequestQueryResolver = resolve<FriendRequestQuery, HookContext>({})
