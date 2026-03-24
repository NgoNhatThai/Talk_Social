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
      // Try to get result deeply to bypass any wrapping
      const result = authResult.data?.data || authResult.data || authResult
      const user = result.user?.data || result.user

      if (user && user._id) {
        const userId = user._id.toString()
        console.log(`[DEBUG channels] Connection ${connection.id} of user ${userId} joined their specific channel`)
        // Join a channel for this specific user ID
        app.channel(`userIds/${userId}`).join(connection)
      } else {
        console.warn('[DEBUG channels] Login event received but user ID not found in authResult', JSON.stringify(authResult).substring(0, 500))
      }
    }
  })


  // Specific publishers
  app.service('messages').publish(async (data: any) => {
    // Handle wrapped result from wrapResult hook
    const actualData = data.data || data
    
    // Check if we have a roomId (supports created event and typing events)
    const roomId = actualData.roomId || (data.result && data.result.roomId)
    
    if (!roomId) {
      console.warn('[DEBUG channels] Message data has no roomId, skipping publish', JSON.stringify(data).substring(0, 200))
      return []
    }

    try {
      // Use _get to bypass hooks that might fail or cause recursion in publisher
      const roomIdStr = (roomId as any).toString()
      const room = await (app.service('rooms') as any)._get(roomIdStr)
      
      if (!room || !room.participantIds) {
        console.warn(`[DEBUG channels] Room ${roomIdStr} not found or has no participants`)
        return []
      }

      const participantIds = room.participantIds || []
      console.log(`[DEBUG channels] Publishing 'messages' event to ${participantIds.length} users in room ${roomIdStr}`)
      
      return participantIds.map((id: any) => app.channel(`userIds/${id.toString()}`))
    } catch (error: any) {
      console.error(`[DEBUG channels] Error publishing message: ${error.message}`)
      return []
    }
  })

  app.service('rooms').publish(async (data: any) => {
    // Handle wrapped result
    const actualData = data.data || data
    
    // If participantIds are missing (e.g. in a partial patch), fetch the full room
    let participantIds = actualData.participantIds
    if (!participantIds && actualData._id) {
      try {
        const room = await (app.service('rooms') as any)._get(actualData._id)
        participantIds = room.participantIds
      } catch (err) {
        console.error(`[DEBUG channels] Error fetching room for publish: ${err}`)
      }
    }

    if (!participantIds || !Array.isArray(participantIds)) {
      return []
    }
    
    console.log(`[DEBUG channels] Publishing 'rooms patched/created' to ${participantIds.length} participants`)
    // Publish room events to participants
    return participantIds.map((id: any) => app.channel(`userIds/${id.toString()}`))
  })

  app.service('friend-requests').publish(async (data: any) => {
    // Handle wrapped result
    const actualData = data.data || data
    
    let fromUserId = actualData.fromUserId
    let toUserId = actualData.toUserId

    // If IDs are missing (e.g. in a partial patch), fetch the full request
    if ((!fromUserId || !toUserId) && actualData._id) {
        try {
            const request = await (app.service('friend-requests') as any)._get(actualData._id)
            fromUserId = request.fromUserId
            toUserId = request.toUserId
        } catch (err) {
            console.error(`[DEBUG channels] Error fetching friend-request for publish: ${err}`)
        }
    }

    if (!fromUserId || !toUserId) {
      console.warn('[DEBUG channels] Friend request data missing user IDs, skipping publish')
      return []
    }
    
    console.log(`[DEBUG channels] Publishing 'friend-requests' event to users ${fromUserId} and ${toUserId}`)
    // Publish friend requests to the relevant users
    return [
      app.channel(`userIds/${fromUserId.toString()}`),
      app.channel(`userIds/${toUserId.toString()}`)
    ]
  })
}
