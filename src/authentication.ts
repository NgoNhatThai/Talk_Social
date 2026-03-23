import { AuthenticationService, JWTStrategy, hooks as authHooks } from '@feathersjs/authentication'
import { LocalStrategy } from '@feathersjs/authentication-local'
import type { Application } from './declarations'
import { randomBytes } from 'node:crypto'

declare module './declarations' {
  interface ServiceTypes {
    authentication: MyAuthenticationService
  }
}

class MyAuthenticationService extends AuthenticationService {
  async create(data: any, params: any) {
    try {
      const response = await super.create(data, params)
      
      // Handle wrapping of the response itself if needed
      const result = response.status && response.data ? response.data : response

      // Only generate refreshToken if it's a login/refresh, not just verifying an existing JWT
      if (result.accessToken && result.user) {
        const refreshToken = randomBytes(40).toString('hex')
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 3) // 3 days

        // UnWrap user if needed
        const actualUser = result.user.status && result.user.data ? result.user.data : result.user
        
        if (!actualUser || !actualUser._id) {
          console.error('[ERROR] User ID not found in result.user:', JSON.stringify(result.user, null, 2))
        } else {
          try {
            const tokenData = {
              token: refreshToken,
              userId: actualUser._id.toString(), // Ensure it's a string for validation
              expiresAt: expiresAt.toISOString()
            }
            
            await this.app.service('tokens').create(tokenData)
            result.refreshToken = refreshToken
          } catch (tokenErr: any) {
            console.error('[ERROR] Failed to save refreshToken to tokens service:', tokenErr.message)
            if (tokenErr.errors) {
              console.error('[DEBUG] Validation errors:', JSON.stringify(tokenErr.errors, null, 2))
            }
            // re-throw to let the user see the full error in logs as requested
            throw tokenErr
          }
        }
      }

      return response
    } catch (err: any) {
      console.error('[ERROR] MyAuthenticationService.create failed:', err.message)
      throw err
    }
  }

  // Override getTokenOptions to ensure sub is always set from user._id
  async getTokenOptions(authResult: any, params: any) {
    let { user } = authResult

    // Check if user is wrapped early and unwrap it for super.getTokenOptions
    if (user && user.status && user.data) {
      user = user.data
      authResult.user = user // Update it so super.getTokenOptions sees the unwrapped user
    }

    let options: any
    try {
      options = await super.getTokenOptions(authResult, params)
    } catch (err: any) {
      const config = (this.app.get('authentication') as any) || {}
      options = { ...(params.jwtOptions || config.jwtOptions || {}) }
    }

    // ALWAYS ensure 'header' is removed if it's not an object (avoid jsonwebtoken sign error)
    if (options && typeof options.header !== 'object') {
      delete options.header
    }

    // Handle wrapping again just in case for final subject setting
    const actualUser = user && user.status && user.data ? user.data : user

    if (actualUser && actualUser._id) {
      options.subject = actualUser._id.toString()
    } else {
      console.warn('[WARNING] Could not determine subject from user:', JSON.stringify(user, null, 2))
    }

    return options
  }
}

class MyLocalStrategy extends LocalStrategy {
  async findEntity(username: string, params: any) {
    // Strip provider to avoid 'wrapResult' hook on internal lookup
    const { provider, ...rest } = params
    return super.findEntity(username, rest)
  }

  async getEntityId(entity: any) {
    const actual = entity.status && entity.data ? entity.data : entity
    return (actual._id || actual.id)?.toString()
  }
}

export const authentication = (app: Application) => {
  const authService = new MyAuthenticationService(app)

  authService.register('jwt', new JWTStrategy())
  authService.register('local', new MyLocalStrategy())

  app.use('authentication', authService, {
    methods: ['create', 'remove']
  })

  app.service('authentication').hooks({
    before: {
      all: [],
      remove: [authHooks.authenticate('jwt')]
    }
  })
}

