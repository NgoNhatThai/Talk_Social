import mongoose from 'mongoose'
import 'dotenv/config'

/**
 * Utility function to connect to MongoDB Cloud using Mongoose
 */
export async function connectToMongo() {
  // Use prioritize the full connection URI from .env if it exists
  const uri = process.env.MONGODB_URI || (() => {
    const username = encodeURIComponent(process.env.MONGOOSE_HOST || '')
    const password = encodeURIComponent(process.env.MONGOOSE_PASSWORD || '')
    // Default fallback URI construction
    return `mongodb+srv://${username}:${password}@cluster-trail-vn.idbcd2u.mongodb.net/`
  })()

  const dbName = process.env.MONGOOSE_DB_NAME || 'Talk_Social'

  const clientOptions: mongoose.ConnectOptions = {
    dbName,
    serverApi: { version: '1', strict: true, deprecationErrors: true }
  }

  try {
    console.log(`Connecting to MongoDB Cloud...`)

    // Connect using Mongoose
    await mongoose.connect(uri, clientOptions)

    // Switch to target DB and get the native DB object for Feathers
    const connection = mongoose.connection.useDb(dbName)

    // Ping to verify
    await connection.db?.admin().command({ ping: 1 })

    console.log("Pinged your deployment. You successfully connected to MongoDB Cloud!")

    // Return the native DB instance for FeathersJS compatibility
    return {
      client: mongoose.connection.getClient(),
      db: connection.db!
    }
  } catch (err: any) {
    console.error('Failed to connect to MongoDB Cloud:', err)
    if (err.code === 'ECONNREFUSED' && err.syscall === 'querySrv') {
      console.error('This is often a DNS issue resolving SRV records. Check your internet connection or try using a different DNS server (like 8.8.8.8).')
    }
    console.error(err)
    throw err
  }
}
