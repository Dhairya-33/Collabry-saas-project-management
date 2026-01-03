import mongoose,{Schema} from 'mongoose'

const projectSchema = new Schema({
    projectName:{
        type:String,
        required:true,
    },
    companyId:{
        type:Schema.Types.ObjectId,
        ref:"Company",
        required:true,
    },
    managerId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    description:{
        type:String,
    },
    archived:{
        type:Boolean,
        default:false
    }
},{timestamps:true})

export const Project = mongoose.model("Project",projectSchema);
