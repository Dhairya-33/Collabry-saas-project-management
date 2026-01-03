import mongoose,{Schema} from 'mongoose'
import { configDotenv } from "dotenv";
configDotenv({
      path:'./.env'
})

const userSchema = new Schema({
    username:{
        type : String,
        required:true,
        unique:true
    },
    password:{
        type : String,
        required:true,
    },
    email:{
        type : String,
        required:true,
        unique:true
    },
    fullname:{
        type : String,
    },
    companyId: {
        type: Schema.Types.ObjectId,  
        ref: "Company",
        required: false   
    },
   
    profilePictureUrl:{
        type:String,
        required:false
    },
    phone:{
        type:String,    
        required:false
    },
    bio:{
        type:String,    
        required:false
    },
    skills:{
        type:[String],    
        required:false
    },
    isProfileComplete:{
        type:Boolean,
        default:false
    },
     refreshToken:{
        type : String,
        default:null,
        unique:false
    }
},{timestamps:true});

export const User = mongoose.model("User",userSchema)
