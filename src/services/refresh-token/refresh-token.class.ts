import { randomBytes } from 'node:crypto';
import type { Application } from '../../declarations';

export class RefreshTokenService {
  constructor(public app: Application) {}

  async create(data: { refreshToken: string }, params: any) {
    const { refreshToken } = data;
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    const tokenEntries = await this.app.service('tokens').find({
      query: {
        token: refreshToken,
        expiresAt: { $gt: new Date().toISOString() }
      },
      paginate: false
    });

    const tokens = Array.isArray(tokenEntries) ? tokenEntries : (tokenEntries as any).data || [];
    const tokenEntry = tokens[0];

    if (!tokenEntry) {
      throw new Error('Invalid or expired refresh token');
    }

    const user = await this.app.service('users').get(tokenEntry.userId);

    // Tạo access token mới (dùng hàm nội bộ của auth service)
    const authService = (this.app.service('authentication') as any);
    const accessToken = await authService.createAccessToken({ sub: user._id.toString() });

    // Rotate refresh token
    await this.app.service('tokens').remove(tokenEntry._id);

    const newRefresh = randomBytes(40).toString('hex');
    const expires = new Date();
    expires.setDate(expires.getDate() + 3);

    await this.app.service('tokens').create({
      token: newRefresh,
      userId: user._id.toString(),
      expiresAt: expires.toISOString()
    });

    return {
      accessToken,
      refreshToken: newRefresh,
      user
    };
  }
}
