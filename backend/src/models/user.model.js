import mongoose,{Schema} from 'mongoose'
import  jwt  from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
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


userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10)
    next()
})



userSchema.methods.generateAccessTKN = async function (req,res){
    return jwt.sign(
        {
            _id : this._id,
            username:this.username,
            email:this.email,
            fullname:this.fullname
        },
        process.env.ACCESSTKN_KEY,
        {
            expiresIn:process.env.ACCESSTKN_EXPIRESIN
        }
    )
}
userSchema.methods.generateRefreshTKN = async function (req,res){
    return jwt.sign(
        {
            _id : this._id,
            username:this.username,
            email:this.email,
            fullname:this.fullname
        },
        process.env.REFRESHTKN_KEY,
        {
            expiresIn:process.env.REFRESHTKN_EXPIRESIN
        }
    )
}

userSchema.methods.verifyPassword = async function(oldPassword) {
    return await bcrypt.compare(oldPassword,this.password);
}



export const User = mongoose.model("User",userSchema)
