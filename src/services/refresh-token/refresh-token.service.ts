import type { Application } from '../../declarations';
import { RefreshTokenService } from './refresh-token.class';

export const refreshToken = (app: Application) => {
  app.use('refresh-token', new RefreshTokenService(app), {
    methods: ['create'],
    events: []
  });

  // Đảm bảo endpoint này public và tham gia vào hook chain
  app.service('refresh-token').hooks({
    around: {
      all: []
    },
    before: {
      all: []
    },
    after: {
      all: [
        async (context) => {
          if (context.params.provider && context.result) {
            console.log('[DEBUG] refresh-token after hook: result present');
          }
        }
      ]
    },
    error: {
      all: []
    }
  });
};

// Add service to the service type list
declare module '../../declarations' {
  interface ServiceTypes {
    'refresh-token': RefreshTokenService
  }
}
