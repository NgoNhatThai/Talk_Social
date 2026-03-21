import type { Params } from '@feathersjs/feathers'
import { MongoDBService } from '@feathersjs/mongodb'
import type { MongoDBAdapterParams, MongoDBAdapterOptions } from '@feathersjs/mongodb'
import type { Application } from '../../declarations'
import type { Message, MessageData, MessagePatch, MessageQuery } from './messages.schema'

export type { Message, MessageData, MessagePatch, MessageQuery }

export interface MessageParams extends MongoDBAdapterParams<MessageQuery> {
  user?: any
}

export class MessageService<ServiceParams extends Params = MessageParams> extends MongoDBService<
  Message,
  MessageData,
  MessageParams,
  MessagePatch
> {}

export const getOptions = (app: Application): MongoDBAdapterOptions => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('mongodbClient').then((db) => db.collection('messages'))
  }
}
