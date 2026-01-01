import mongoose from 'mongoose'

import dotenv from 'dotenv'

dotenv.config(
    { path: "./.env" }
)


const connectDB =  async ()=>{
  try {
    console.log(process.env.MONGODB_URI)
      const connected = await mongoose.connect(process.env.MONGODB_URI,{
          dbName : 'CollabryDB'
      })
  
      console.log(`✅ MongoDB Connected: ${connected.connection.host}`);
  } 
  catch (error) {
        console.log("MONGODB connection Failed:",error)
        process.exit(1);
    }
  }


export default connectDB