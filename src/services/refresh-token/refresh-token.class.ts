import { randomBytes } from 'node:crypto';
import type { Application } from '../../declarations';

export class RefreshTokenService {
  constructor(public app: Application) {}

  async create(data: { refreshToken: string }, params: any) {
    const { refreshToken } = data;
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    // Truy vấn token entry
    const tokenEntries = await this.app.service('tokens').find({
      query: {
        token: refreshToken,
        expiresAt: { $gt: new Date().toISOString() }
      },
      paginate: false
    });

    // UnWrap if needed (since wrapResult hook might have run on internal call if not careful, 
    // though usually provider is null for internal calls)
    const tokens = (tokenEntries as any).data || (Array.isArray(tokenEntries) ? tokenEntries : []);
    const tokenEntry = tokens[0];

    if (!tokenEntry) {
      throw new Error('Invalid or expired refresh token');
    }

    // Lấy user
    let user = await this.app.service('users').get(tokenEntry.userId);
    // UnWrap user if it was wrapped by wrapResult hook
    if (user && (user as any).status && (user as any).data) {
      user = (user as any).data;
    }

    if (!user || !(user as any)._id) {
       throw new Error('User not found for this token');
    }

    // Tạo access token mới
    const authService = (this.app.service('authentication') as any);
    const accessToken = await authService.createAccessToken({ sub: (user as any)._id.toString() });

    // Rotate refresh token
    await this.app.service('tokens').remove(tokenEntry._id);

    const newRefresh = randomBytes(40).toString('hex');
    const expires = new Date();
    expires.setDate(expires.getDate() + 3);

    await this.app.service('tokens').create({
      token: newRefresh,
      userId: (user as any)._id.toString(),
      expiresAt: expires.toISOString()
    });

    const result = {
      accessToken,
      refreshToken: newRefresh,
      user: typeof (user as any).toObject === 'function' ? (user as any).toObject() : user
    };

    console.log('[DEBUG] RefreshTokenService.create success, returned data for user:', (user as any).phoneNumber || (user as any)._id);
    
    return result;
  }
}
