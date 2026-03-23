import { Type, getValidator, querySyntax, ObjectIdSchema } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'
import { dataValidator, queryValidator } from '../../validators'
import type { HookContext } from '../../declarations'
import { resolve } from '@feathersjs/schema'

// Main data model schema - Permissive for database compatibility
export const userSchema = Type.Object(
  {
    _id: ObjectIdSchema(),
    username: Type.Optional(Type.String()),
    password: Type.Optional(Type.String()), // MUST be optional for resolvers to hide it
    phoneNumber: Type.Optional(Type.String()),
    email: Type.Optional(Type.String({ format: 'email' })),
    isActive: Type.Optional(Type.Boolean()),
    refreshToken: Type.Optional(Type.String()),
    avatar: Type.Optional(Type.String()),
    createdAt: Type.Optional(Type.Any()),
    updatedAt: Type.Optional(Type.Any()),
    __v: Type.Optional(Type.Number())
  },
  { $id: 'User', additionalProperties: true }
)
export type User = Static<typeof userSchema>
export const userValidator = getValidator(userSchema, dataValidator)
export const userResolver = resolve<User, HookContext>({
  properties: {
    password: async () => undefined
  }
})

export const userExternalResolver = resolve<User, HookContext>({
  properties: {
    password: async () => undefined
  }
})

// Schema for creating new entries - Required fields for registration
export const userDataSchema = Type.Object(
  {
    phoneNumber: Type.String(),
    password: Type.String(),
    username: Type.Optional(Type.String()),
    email: Type.String({ format: 'email' })
  },
  { $id: 'UserData', additionalProperties: true }
)
export type UserData = Static<typeof userDataSchema>
export const userDataValidator = getValidator(userDataSchema, dataValidator)
export const userDataResolver = resolve<UserData, HookContext>({})

// Schema for updating existing entries
export const userPatchSchema = Type.Partial(userDataSchema, {
  $id: 'UserPatch'
})
export type UserPatch = Static<typeof userPatchSchema>
export const userPatchValidator = getValidator(userPatchSchema, dataValidator)
export const userPatchResolver = resolve<UserPatch, HookContext>({})

// Schema for allowed query properties
export const userQueryProperties = Type.Pick(userSchema, ['_id', 'username', 'phoneNumber', 'email'])
export const userQuerySchema = Type.Intersect(
  [
    querySyntax(userQueryProperties),
    Type.Object({}, { additionalProperties: true })
  ],
  { additionalProperties: true }
)
export type UserQuery = Static<typeof userQuerySchema>
export const userQueryValidator = getValidator(userQuerySchema, queryValidator)
export const userQueryResolver = resolve<UserQuery, HookContext>({})
