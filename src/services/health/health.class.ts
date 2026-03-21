import type { Params, ServiceOptions } from '@feathersjs/feathers'
import type { Application } from '../../declarations'

interface HealthData {
  ok: boolean;
  status: string;
  mongodb: string;
  timestamp: string;
  environment: string;
}

export class HealthService {
  constructor(protected app: Application) {}

  /**
   * Status check for the service
   * Accessible via GET /health
   */
  async find(_params?: Params): Promise<HealthData> {
    let mongoStatus = 'unknown'

    try {
      // Access the MongoDB client registered in src/mongodb.ts
      const mongoClient = await this.app.get('mongodbClient');
      if (mongoClient) {
        // Run a simple command to check connectivity
        await mongoClient.admin().command({ ping: 1 });
        mongoStatus = 'connected';
      } else {
        mongoStatus = 'missing-initialization';
      }
    } catch (err) {
      console.error('Health check database error:', err);
      mongoStatus = 'error';
    }

    return {
      ok: true,
      status: 'alive',
      mongodb: mongoStatus,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    }
  }
}
