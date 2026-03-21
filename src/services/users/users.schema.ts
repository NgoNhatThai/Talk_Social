import { Type, getValidator, querySyntax, ObjectIdSchema } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'
import { dataValidator, queryValidator } from '../../validators'
import type { HookContext } from '../../declarations'
import { resolve } from '@feathersjs/schema'
// Removed import from @feathersjs/mongodb

// Main data model schema
export const userSchema = Type.Object(
  {
    _id: ObjectIdSchema(),
    username: Type.Optional(Type.String()),
    password: Type.String(),
    phoneNumber: Type.String(),
    email: Type.Optional(Type.String({ format: 'email' }))
  },
  { $id: 'User', additionalProperties: false }
)
export type User = Static<typeof userSchema>
export const userValidator = getValidator(userSchema, dataValidator)
export const userResolver = resolve<User, HookContext>({
  // Register hooks that populate or secure data
  properties: {
    password: async () => undefined
  }
})

export const userExternalResolver = resolve<User, HookContext>({
  properties: {
    // Hidden from the external world
    password: async () => undefined
  }
})

// Schema for creating new entries
export const userDataSchema = Type.Pick(userSchema, ['phoneNumber', 'password', 'username', 'email'], {
  $id: 'UserData'
})
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
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type UserQuery = Static<typeof userQuerySchema>
export const userQueryValidator = getValidator(userQuerySchema, queryValidator)
export const userQueryResolver = resolve<UserQuery, HookContext>({})
