import { Type, getValidator, querySyntax, ObjectIdSchema } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'
import { dataValidator, queryValidator } from '../../validators'
import type { HookContext } from '../../declarations'
import { resolve } from '@feathersjs/schema'

// Main data model schema
export const messageSchema = Type.Object(
  {
    _id: ObjectIdSchema(),
    senderId: ObjectIdSchema(),
    roomId: ObjectIdSchema(),
    text: Type.String(),
    type: Type.Enum({
      text: 'text',
      image: 'image',
      file: 'file'
    }),
    replyToId: Type.Optional(ObjectIdSchema()),
    readBy: Type.Array(ObjectIdSchema())
  },
  { $id: 'Message', additionalProperties: false }
)
export type Message = Static<typeof messageSchema>
export const messageValidator = getValidator(messageSchema, dataValidator)
export const messageResolver = resolve<Message, HookContext>({})

export const messageExternalResolver = resolve<Message, HookContext>({})

// Schema for creating new entries
export const messageDataSchema = Type.Pick(messageSchema, ['roomId', 'text', 'type', 'replyToId', 'senderId', 'readBy'], {
  $id: 'MessageData'
})
export type MessageData = Static<typeof messageDataSchema>
export const messageDataValidator = getValidator(messageDataSchema, dataValidator)
export const messageDataResolver = resolve<MessageData, HookContext>({
  properties: {
    senderId: async (_value: any, _data: any, context: any) => context.params.user?._id,
    readBy: async (_value: any, _data: any, context: any) => [context.params.user?._id]
  }
})

// Schema for updating existing entries
export const messagePatchSchema = Type.Partial(
  Type.Pick(messageSchema, ['readBy', 'text']),
  { $id: 'MessagePatch' }
)
export type MessagePatch = Static<typeof messagePatchSchema>
export const messagePatchValidator = getValidator(messagePatchSchema, dataValidator)
export const messagePatchResolver = resolve<MessagePatch, HookContext>({})

// Schema for allowed query properties
export const messageQueryProperties = Type.Pick(messageSchema, ['_id', 'roomId', 'senderId', 'type'])
export const messageQuerySchema = Type.Intersect(
  [
    querySyntax(messageQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type MessageQuery = Static<typeof messageQuerySchema>
export const messageQueryValidator = getValidator(messageQuerySchema, queryValidator)
export const messageQueryResolver = resolve<MessageQuery, HookContext>({})
