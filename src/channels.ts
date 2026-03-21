import '@feathersjs/transport-commons'
import type { Application, HookContext } from './declarations'

export const channels = (app: Application) => {
  if (typeof app.channel !== 'function') {
    // If no real-time support is available, do nothing
    return
  }

  app.on('connection', (connection: any) => {
    // On a new real-time connection, add it to the anonymous channel
    app.channel('anonymous').join(connection)
  })

  app.on('login', (authResult: any, { connection }: any) => {
    // connection can be undefined if there is no real-time connection, e.g. when logging in via REST
    if (connection) {
      // The connection is no longer anonymous, remove it of the anonymous channel
      app.channel('anonymous').leave(connection)

      // Add it to the authenticated user channel
      app.channel('authenticated').join(connection)

      // Join a channel for this specific user ID
      app.channel(`userIds/${authResult.user._id}`).join(connection)
    }
  })


  // Specific publishers
  app.service('messages').publish(async (data: any) => {
    // Publish message to the room channel
    const room = await app.service('rooms').get(data.roomId)
    return room.participantIds.map((id: any) => app.channel(`userIds/${id}`))
  })

  app.service('rooms').publish((data: any) => {
    // Publish room events to participants
    return data.participantIds.map((id: any) => app.channel(`userIds/${id}`))
  })

  app.service('friend-requests').publish((data: any) => {
    // Publish friend requests to the relevant users
    return [
      app.channel(`userIds/${data.fromUserId}`),
      app.channel(`userIds/${data.toUserId}`)
    ]
  })
}
