import type { Params } from '@feathersjs/feathers'
import { MongoDBService } from '@feathersjs/mongodb'
import type { MongoDBAdapterParams, MongoDBAdapterOptions } from '@feathersjs/mongodb'
import type { Application } from '../../declarations'
import type { FriendRequest, FriendRequestData, FriendRequestPatch, FriendRequestQuery } from './friend-requests.schema'

export type { FriendRequest, FriendRequestData, FriendRequestPatch, FriendRequestQuery }

export interface FriendRequestParams extends MongoDBAdapterParams<FriendRequestQuery> {
  user?: any
}

export class FriendRequestService<ServiceParams extends Params = FriendRequestParams> extends MongoDBService<
  FriendRequest,
  FriendRequestData,
  FriendRequestParams,
  FriendRequestPatch
> {}

export const getOptions = (app: Application): MongoDBAdapterOptions => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('mongodbClient').then((db) => db.collection('friend-requests'))
  }
}
