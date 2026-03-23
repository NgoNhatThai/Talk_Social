import type { Application } from '../../declarations';
import { RefreshTokenService } from './refresh-token.class';

export const refreshToken = (app: Application) => {
  app.use('refresh-token', new RefreshTokenService(app), {
    methods: ['create'],
    events: []
  });

  // Không cần hook authenticate gì cả → endpoint này public
};

// Add service to the service type list
declare module '../../declarations' {
  interface ServiceTypes {
    'refresh-token': RefreshTokenService
  }
}
