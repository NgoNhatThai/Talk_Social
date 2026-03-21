import type { Params } from '@feathersjs/feathers'
import { MongoDBService } from '@feathersjs/mongodb'
import type { MongoDBAdapterParams, MongoDBAdapterOptions } from '@feathersjs/mongodb'
import type { Application } from '../../declarations'
import type { Token, TokenData, TokenPatch, TokenQuery } from './tokens.schema'

export type { Token, TokenData, TokenPatch, TokenQuery }

export interface TokenParams extends MongoDBAdapterParams<TokenQuery> {}

export class TokenService<ServiceParams extends Params = TokenParams> extends MongoDBService<
  Token,
  TokenData,
  TokenParams,
  TokenPatch
> {}

export const getOptions = (app: Application): MongoDBAdapterOptions => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('mongodbClient').then((db) => db.collection('tokens'))
  }
}
