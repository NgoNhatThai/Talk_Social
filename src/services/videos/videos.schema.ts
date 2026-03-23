import { Type, getValidator, querySyntax, ObjectIdSchema } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'
import { dataValidator, queryValidator } from '../../validators'
import type { HookContext } from '../../declarations'
import { resolve } from '@feathersjs/schema'

// Main data model schema
export const videoSchema = Type.Object(
  {
    _id: ObjectIdSchema(),
    userId: ObjectIdSchema(),
    url: Type.String({ format: 'uri' }),
    title: Type.Optional(Type.String())
  },
  { $id: 'Video', additionalProperties: true }
)
export type Video = Static<typeof videoSchema>
export const videoValidator = getValidator(videoSchema, dataValidator)
export const videoResolver = resolve<Video, HookContext>({})

export const videoExternalResolver = resolve<Video, HookContext>({
  properties: {
    // Hide the direct URL if requested for security/streaming-only access
    url: async () => undefined
  }
})

// Schema for creating new entries
export const videoDataSchema = Type.Pick(videoSchema, ['url', 'title', 'userId'], {
  $id: 'VideoData'
})
export type VideoData = Static<typeof videoDataSchema>
export const videoDataValidator = getValidator(videoDataSchema, dataValidator)
export const videoDataResolver = resolve<VideoData, HookContext>({
  properties: {
    userId: async (_value: any, _data: any, context: any) => context.params.user?._id
  }
})

// Schema for updating existing entries
export const videoPatchSchema = Type.Partial(videoDataSchema, {
  $id: 'VideoPatch'
})
export type VideoPatch = Static<typeof videoPatchSchema>
export const videoPatchValidator = getValidator(videoPatchSchema, dataValidator)
export const videoPatchResolver = resolve<VideoPatch, HookContext>({})

// Schema for allowed query properties
export const videoQueryProperties = Type.Pick(videoSchema, ['_id', 'userId', 'title'])
export const videoQuerySchema = Type.Intersect(
  [
    querySyntax(videoQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: true })
  ],
  { additionalProperties: true }
)
export type VideoQuery = Static<typeof videoQuerySchema>
export const videoQueryValidator = getValidator(videoQuerySchema, queryValidator)
export const videoQueryResolver = resolve<VideoQuery, HookContext>({})
