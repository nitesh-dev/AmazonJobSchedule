import { connect, Schema, model } from 'mongoose';
console.log('Hello via Bun!');

// Connect to MongoDB
// Connect to MongoDB

// Run everything
// (async () => {
//   await connectDB();
//   await createUser();
//   await findAdultUsers();
// })();

// Define a schema
const logSchema = new Schema({
  sessionTime: String,
  data: String,
});

// Create a model
const Log = model('Log', logSchema);

export class MongoDB {
  private isConnected: boolean = false;

  constructor() {
    this.connectDB();
  }

  async connectDB() {
    try {
      await connect(
        'mongodb+srv://watchmoviesmkv:Yc7SJ5kS1uKsGyFF@cluster0.oy13ari.mongodb.net/test'
      );
      console.log('✅ Connected to MongoDB');
      this.isConnected = true;
    } catch (err) {
      console.error('❌ MongoDB connection error:', err);
    }
  }

  // Create and save a user
  async createLog(sessionTime: string, data: string) {
    try {
      const log = new Log({
        sessionTime,
        data,
      });

      const savedLog = await log.save();
      console.log('👤 Log saved:', savedLog);
      return true
    } catch (err) {
      console.error('❌ Error creating log:', err);
      return false
    }
  }
}
