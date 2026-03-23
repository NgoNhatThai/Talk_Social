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

  async refresh(data: any, params: any) {
    console.log('[DEBUG] Refresh called with:', JSON.stringify(data, null, 2))
    const { refreshToken } = data
    if (!refreshToken) {
      throw new Error('Refresh token is required')
    }

    const tokenEntries = await this.app.service('tokens').find({
      query: {
        token: refreshToken,
        expiresAt: { $gt: new Date().toISOString() }
      },
      paginate: false
    })

    // Handle potential wrapping of find result
    const resultArr = (tokenEntries as any).data ? (tokenEntries as any).data : tokenEntries
    const tokenEntry = Array.isArray(resultArr) ? resultArr[0] : (resultArr as any).data?.[0]
    
    if (!tokenEntry) {
      throw new Error('Invalid or expired refresh token')
    }

    const userResponse = await this.app.service('users').get(tokenEntry.userId)
    const user = (userResponse as any).data ? (userResponse as any).data : userResponse
    
    // Create new access token
    const accessToken = await this.createAccessToken({ sub: (user._id || user.id).toString() })
    
    // Rotate refresh token (revoke old, create new)
    await this.app.service('tokens').remove(tokenEntry._id)
    const newRefreshToken = randomBytes(40).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 3)

    await this.app.service('tokens').create({
      token: newRefreshToken,
      userId: (user._id || user.id).toString(),
      expiresAt: expiresAt.toISOString()
    })

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user
    }
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
    methods: ['create', 'remove', 'refresh']
  })

  app.service('authentication').hooks({
    before: {
      all: [],
      // Ensure 'refresh' is public and doesn't fail if an expired header is present
      refresh: [
        async (context) => {
           delete context.params.authentication
           delete context.params.user
        }
      ],
      remove: [authHooks.authenticate('jwt')]
    }
  })
}

