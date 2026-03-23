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
      // The connection is no longer anonymous, remove it from the anonymous channel
      app.channel('anonymous').leave(connection)

      // Add it to the authenticated user channel
      app.channel('authenticated').join(connection)

      // Handle wrapped authResult from wrapResult hook
      const result = authResult.data || authResult
      const user = result.user?.data || result.user

      if (user && user._id) {
        console.log(`[DEBUG channels] Joining user ${user._id} to their specific channel`)
        // Join a channel for this specific user ID
        app.channel(`userIds/${user._id}`).join(connection)
      } else {
        console.warn('[DEBUG channels] Login event received but user ID not found in authResult', {
          hasData: !!authResult.data,
          hasUser: !!result.user
        })
      }
    }
  })


  // Specific publishers
  app.service('messages').publish(async (data: any) => {
    // Handle wrapped result from wrapResult hook
    const actualData = data.data || data
    
    // Check if we have a roomId
    if (!actualData.roomId) {
      console.warn('[DEBUG channels] Message data has no roomId, skipping publish', { 
        hasWrapper: !!data.data,
        keys: Object.keys(actualData) 
      })
      return []
    }

    try {
      // Use _get to bypass hooks that might fail or cause recursion in publisher
      const room = await (app.service('rooms') as any)._get(actualData.roomId)
      
      if (!room || !room.participantIds) {
        console.warn(`[DEBUG channels] Room ${actualData.roomId} not found or has no participants`)
        return []
      }

      if (room.participantIds.length > 0) {
        console.log(`[DEBUG channels] Publishing 'messages created' to ${room.participantIds.length} participants in room ${actualData.roomId}`)
      }
      return room.participantIds.map((id: any) => app.channel(`userIds/${id}`))
    } catch (error: any) {
      console.error(`[DEBUG channels] Error publishing message: ${error.message}`)
      return []
    }
  })

  app.service('rooms').publish((data: any) => {
    // Handle wrapped result
    const actualData = data.data || data
    
    if (!actualData.participantIds) {
      return []
    }
    
    console.log(`[DEBUG channels] Publishing 'rooms patched/created' to ${actualData.participantIds.length} participants`)
    // Publish room events to participants
    return actualData.participantIds.map((id: any) => app.channel(`userIds/${id}`))
  })

  app.service('friend-requests').publish((data: any) => {
    // Handle wrapped result
    const actualData = data.data || data
    
    // Publish friend requests to the relevant users
    return [
      app.channel(`userIds/${actualData.fromUserId}`),
      app.channel(`userIds/${actualData.toUserId}`)
    ]
  })
}
