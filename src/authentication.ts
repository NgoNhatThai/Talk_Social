import { AuthenticationService, JWTStrategy } from '@feathersjs/authentication'
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
    const result = await super.create(data, params)
    
    // Only generate refreshToken if it's a login/refresh, not just verifying an existing JWT
    if (result.accessToken && result.user) {
      const refreshToken = randomBytes(40).toString('hex')
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 3) // 3 days

      await this.app.service('tokens').create({
        token: refreshToken,
        userId: result.user._id,
        expiresAt: expiresAt.toISOString()
      })

      result.refreshToken = refreshToken
    }

    return result
  }

  async refresh(data: any, params: any) {
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

    const tokenEntry = (tokenEntries as any)[0]
    if (!tokenEntry) {
      throw new Error('Invalid or expired refresh token')
    }

    const user = await this.app.service('users').get(tokenEntry.userId)
    
    // Create new access token
    const accessToken = await this.createAccessToken({ sub: user._id })
    
    // Rotate refresh token (revoke old, create new)
    await this.app.service('tokens').remove(tokenEntry._id)
    const newRefreshToken = randomBytes(40).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 3)

    await this.app.service('tokens').create({
      token: newRefreshToken,
      userId: user._id,
      expiresAt: expiresAt.toISOString()
    })

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user
    }
  }
}

export const authentication = (app: Application) => {
  const authService = new MyAuthenticationService(app)

  authService.register('jwt', new JWTStrategy())
  authService.register('local', new LocalStrategy())

  app.use('authentication', authService, {
    methods: ['create', 'remove', 'refresh']
  })
}
