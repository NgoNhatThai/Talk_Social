import type { Params } from '@feathersjs/feathers'
import { MongoDBService } from '@feathersjs/mongodb'
import type { MongoDBAdapterParams, MongoDBAdapterOptions } from '@feathersjs/mongodb'
import type { Application } from '../../declarations'
import type { Room, RoomData, RoomPatch, RoomQuery } from './rooms.schema'

export type { Room, RoomData, RoomPatch, RoomQuery }

export interface RoomParams extends MongoDBAdapterParams<RoomQuery> {
  user?: any
}

export class RoomService<ServiceParams extends Params = RoomParams> extends MongoDBService<
  Room,
  RoomData,
  RoomParams,
  RoomPatch
> {}

export const getOptions = (app: Application): MongoDBAdapterOptions => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('mongodbClient').then((db) => db.collection('rooms'))
  }
}
