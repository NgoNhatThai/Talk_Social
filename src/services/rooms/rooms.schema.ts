import { Type, getValidator, querySyntax, ObjectIdSchema } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'
import { dataValidator, queryValidator } from '../../validators'
import type { HookContext } from '../../declarations'
import { resolve } from '@feathersjs/schema'

// Main data model schema
export const roomSchema = Type.Object(
  {
    _id: ObjectIdSchema(),
    participantIds: Type.Array(ObjectIdSchema()),
    type: Type.Enum({
      direct: 'direct',
      group: 'group'
    }),
    name: Type.Optional(Type.String()),
    lastMessageId: Type.Optional(ObjectIdSchema())
  },
  { $id: 'Room', additionalProperties: false }
)
export type Room = Static<typeof roomSchema>
export const roomValidator = getValidator(roomSchema, dataValidator)
export const roomResolver = resolve<Room, HookContext>({})

export const roomExternalResolver = resolve<Room, HookContext>({})

// Schema for creating new entries
export const roomDataSchema = Type.Pick(roomSchema, ['participantIds', 'type', 'name'], {
  $id: 'RoomData'
})
export type RoomData = Static<typeof roomDataSchema>
export const roomDataValidator = getValidator(roomDataSchema, dataValidator)
export const roomDataResolver = resolve<RoomData, HookContext>({})

// Schema for updating existing entries
export const roomPatchSchema = Type.Partial(roomSchema, {
  $id: 'RoomPatch'
})
export type RoomPatch = Static<typeof roomPatchSchema>
export const roomPatchValidator = getValidator(roomPatchSchema, dataValidator)
export const roomPatchResolver = resolve<RoomPatch, HookContext>({})

// Schema for allowed query properties
export const roomQueryProperties = Type.Pick(roomSchema, ['_id', 'participantIds', 'type', 'name'])
export const roomQuerySchema = Type.Intersect(
  [
    querySyntax(roomQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: true })
  ],
  { additionalProperties: true }
)
export type RoomQuery = Static<typeof roomQuerySchema>
export const roomQueryValidator = getValidator(roomQuerySchema, queryValidator)
export const roomQueryResolver = resolve<RoomQuery, HookContext>({})
