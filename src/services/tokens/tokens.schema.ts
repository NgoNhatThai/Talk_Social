import { Type, getValidator, querySyntax, ObjectIdSchema } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'
import { dataValidator, queryValidator } from '../../validators'
import type { HookContext } from '../../declarations'
import { resolve } from '@feathersjs/schema'

// Main data model schema
export const tokenSchema = Type.Object(
  {
    _id: ObjectIdSchema(),
    token: Type.String(),
    userId: ObjectIdSchema(),
    expiresAt: Type.String({ format: 'date-time' })
  },
  { $id: 'Token', additionalProperties: true }
)
export type Token = Static<typeof tokenSchema>
export const tokenValidator = getValidator(tokenSchema, dataValidator)
export const tokenResolver = resolve<Token, HookContext>({
  properties: {
    _id: async (value) => value,
    token: async (value) => value,
    userId: async (value) => value,
    expiresAt: async (value) => value
  }
})

export const tokenExternalResolver = resolve<Token, HookContext>({
  properties: {
    _id: async (value) => value,
    token: async (value) => value,
    userId: async (value) => value,
    expiresAt: async (value) => value
  }
})

// Schema for creating new entries
export const tokenDataSchema = Type.Pick(tokenSchema, ['token', 'userId', 'expiresAt'], {
  $id: 'TokenData'
})
export type TokenData = Static<typeof tokenDataSchema>
export const tokenDataValidator = getValidator(tokenDataSchema, dataValidator)
export const tokenDataResolver = resolve<TokenData, HookContext>({
  properties: {
    token: async (value) => value,
    userId: async (value) => value,
    expiresAt: async (value) => value
  }
})

// Schema for updating existing entries
export const tokenPatchSchema = Type.Partial(tokenDataSchema, {
  $id: 'TokenPatch'
})
export type TokenPatch = Static<typeof tokenPatchSchema>
export const tokenPatchValidator = getValidator(tokenPatchSchema, dataValidator)
export const tokenPatchResolver = resolve<TokenPatch, HookContext>({
  properties: {
    token: async (value) => value,
    userId: async (value) => value,
    expiresAt: async (value) => value
  }
})

// Schema for allowed query properties
export const tokenQueryProperties = Type.Pick(tokenSchema, ['_id', 'token', 'userId'])
export const tokenQuerySchema = Type.Intersect(
  [
    querySyntax(tokenQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: true })
  ],
  { additionalProperties: true }
)
export type TokenQuery = Static<typeof tokenQuerySchema>
export const tokenQueryValidator = getValidator(tokenQuerySchema, queryValidator)
export const tokenQueryResolver = resolve<TokenQuery, HookContext>({})
