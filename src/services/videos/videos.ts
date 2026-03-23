import { hooks as authHooks } from '@feathersjs/authentication'
import { hooks as schemaHooks } from '@feathersjs/schema'
import type { Application } from '../../declarations'
import { VideoService, getOptions } from './videos.class'
import {
  videoExternalResolver,
  videoPatchResolver,
  videoPatchValidator,
  videoQueryResolver,
  videoQueryValidator,
  videoResolver,
  videoDataResolver,
  videoDataValidator
} from './videos.schema'

export const videos = (app: Application) => {
  const videoService = new VideoService(getOptions(app))
  
  app.use('videos', videoService, {
    methods: ['find', 'get', 'create', 'patch', 'remove'],
    events: []
  })

  // Define custom streaming endpoint using Koa middleware
  app.use(async (ctx, next) => {
    if (ctx.method === 'GET' && ctx.path.startsWith('/videos/') && ctx.path.endsWith('/stream')) {
      const id = ctx.path.split('/')[2]
      try {
        return await videoService.proxyStream(id, ctx)
      } catch (err: any) {
        ctx.status = err.code || 500
        ctx.body = { message: err.message }
      }
    }
    await next()
  })

  app.service('videos').hooks({
    around: {
      all: [
        async (context, next) => {
          if (context.params.provider) {
            return authHooks.authenticate('jwt')(context, next)
          }
          return next()
        },
        schemaHooks.resolveExternal(videoExternalResolver),
        schemaHooks.resolveResult(videoResolver)
      ]
    },
    before: {
      all: [],
      find: [// videoQueryValidator, 
        schemaHooks.resolveQuery(videoQueryResolver)],
      get: [// videoQueryValidator, 
        schemaHooks.resolveQuery(videoQueryResolver)],
      create: [videoDataValidator, schemaHooks.resolveData(videoDataResolver)],
      patch: [videoPatchValidator, schemaHooks.resolveData(videoPatchResolver)],
      remove: []
    }
  })
}

declare module '../../declarations' {
  interface ServiceTypes {
    videos: VideoService
  }
}
