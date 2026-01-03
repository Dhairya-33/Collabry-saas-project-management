import mongoose,{Schema} from 'mongoose'

const company = new Schema({
    companyName:{
        type:String,
        required:true,
        unique:true
    },
    description:{
        type:String,
    },
    
    createdBy:{
        type: Schema.Types.ObjectId, ref: "User" 
    }
},{timestamps:true})

export const Company = mongoose.model("Company",company);
