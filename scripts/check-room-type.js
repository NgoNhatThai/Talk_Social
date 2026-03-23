const { MongoClient, ObjectId } = require('mongodb');

async function main() {
  const uri = "mongodb://127.0.0.1:27017/Talk_Social";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('Talk_Social');
    const roomIdStr = '69c0defa882bea31f013bb09';
    
    const roomWithObjectId = await db.collection('rooms').findOne({ _id: new ObjectId(roomIdStr) });
    console.log('--- Searching as ObjectId ---');
    console.log(roomWithObjectId);

    const roomWithStringId = await db.collection('rooms').findOne({ _id: roomIdStr });
    console.log('--- Searching as String ---');
    console.log(roomWithStringId);

  } finally {
    await client.close();
  }
}

main().catch(console.error);
