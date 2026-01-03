import mongoose,{Schema} from 'mongoose'

const projectMember = new Schema({
    userId:{
        type : Schema.Types.ObjectId,
        ref:"User",
        required:true,
        unique:true
    },
    projectId:{
        type : Schema.Types.ObjectId,
        ref:"Project",
        required:true,
        required:true,
    },
    companyId:{
        type:Schema.Types.ObjectId,
        ref:"Company",
        required:true,
        unique:true
    },
    role: { type: String, enum: ["admin", "manager", "employee"], default: "employee" },
  
},
{
    timestamps:true
})

export const ProjectMember = mongoose.model("ProjectMember",projectMember)
