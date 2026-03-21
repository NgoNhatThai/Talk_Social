import { videos } from './videos/videos'
import { messages } from './messages/messages'
import { rooms } from './rooms/rooms'
import { friendRequests } from './friend-requests/friend-requests'
import { users } from './users/users'
import { health } from './health/health'
import type { Application } from '../declarations'

export const services = (app: Application) => {
  app.configure(videos)
  app.configure(messages)
  app.configure(rooms)
  app.configure(friendRequests)
  app.configure(users)
  app.configure(health)
}
