import type { Params } from '@feathersjs/feathers'
import { MongoDBService } from '@feathersjs/mongodb'
import type { MongoDBAdapterParams, MongoDBAdapterOptions } from '@feathersjs/mongodb'
import type { Application } from '../../declarations'
import type { Video, VideoData, VideoPatch, VideoQuery } from './videos.schema'
import axios from 'axios'
import type { Context } from 'koa'

export type { Video, VideoData, VideoPatch, VideoQuery }

export interface VideoParams extends MongoDBAdapterParams<VideoQuery> {
  user?: any
}

export class VideoService<ServiceParams extends Params = VideoParams> extends MongoDBService<
  Video,
  VideoData,
  VideoParams,
  VideoPatch
> {
  // Custom method to handle streaming requests
  async proxyStream(id: string, koaContext: Context) {
    const video = await this.get(id)
    const response = await axios.get(video.url, {
      responseType: 'stream',
      headers: {
        // Forward potential Range headers from client to remote source if needed
        'Range': (koaContext.request as any).headers['range'] || ''
      }
    })

    // Forward relevant headers back to client
    koaContext.set('Content-Type', response.headers['content-type'] || 'video/mp4')
    if (response.headers['content-length']) koaContext.set('Content-Length', response.headers['content-length'])
    if (response.headers['content-range']) koaContext.set('Content-Range', response.headers['content-range'])
    if (response.headers['accept-ranges']) koaContext.set('Accept-Ranges', response.headers['accept-ranges'])
    koaContext.status = response.status

    koaContext.body = response.data
    return koaContext.body
  }
}

export const getOptions = (app: Application): MongoDBAdapterOptions => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('mongodbClient').then((db) => db.collection('videos'))
  }
}
