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
        const userId = user._id.toString()
        console.log(`[DEBUG channels] Joining user ${userId} to their specific channel`)
        // Join a channel for this specific user ID
        app.channel(`userIds/${userId}`).join(connection)
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
      return room.participantIds.map((id: any) => app.channel(`userIds/${id.toString()}`))
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
