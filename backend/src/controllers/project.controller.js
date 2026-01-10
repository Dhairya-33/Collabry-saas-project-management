import { Project } from "../models/project.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { Company } from "../models/company.model.js";
import { ProjectMember } from "../models/projectMember.model.js";

const createProject = asyncHandler(async (req,res) => {
    const { projectName, description,managerId} = req.body; 

    const user = req.user;
    if (!user) {
        throw new ApiError(401, "User not authenticated");
    }
    if (!user.companyId) {
        throw new ApiError(400, "User does not belong to any company");
    }    
     
    const company =  await Company.findById(user.companyId);
    if(!company){
        throw new ApiError(404,"Company not found");
    }   
    if(company.createdBy.toString() !== user._id.toString()){
        throw new ApiError(403,"Only company owner can create projects");
    }   

    if (!projectName) {
        throw new ApiError(400, "Project name is required");
    }  

    const existingProject = await Project.findOne(
        {$and: [{ projectName }, { companyId: user.companyId }]}
    )
    if (existingProject) {
        throw new ApiError(400, "Project already exists");
    } 

    if(!managerId){
        throw new ApiError(400,"Manager ID is required");
     }
    const manager = await User.findById(managerId);
    if (!manager) {
        throw new ApiError(404, "Manager not found");
    }       
    if (manager.companyId.toString() !== user.companyId.toString()) {
        throw new ApiError(400, "Manager does not belong to your company");
    } 
    
    const project = await Project.create({ projectName,companyId:user.companyId ,managerId,description});
    if (!project) {     
        throw new ApiError(500, "Failed to create project");
    }

    const projectAdmin = await ProjectMember.create({companyId:user.companyId,projectId:project._id,userId:user._id,role:"admin"})
    if(!projectAdmin){
        throw new ApiError(500,"Failed to assign admin to the project");
    }
    const projectManager = await ProjectMember.create({companyId:user.companyId,projectId:project._id,userId:managerId,role:"manager"})
    if(!projectManager){
        throw new ApiError(500,"Failed to assign manager to the project");
    }
     
    res.status(201).json({
        status: "success",
        message: "Project created successfully",
        data: project
    });
})

export { createProject };
