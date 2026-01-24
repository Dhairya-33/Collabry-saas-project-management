import { Project } from "../models/project.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { Company } from "../models/company.model.js";
import { ProjectMember } from "../models/projectMember.model.js";
import { ProjectInvite } from "../models/projectInvite.model.js";

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


const getallProjects = asyncHandler(async (req,res) => {    
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
        throw new ApiError(403,"Only company owner can view all projects");
    }   

    const projects = await Project.find({companyId:user.companyId,archived:false});    
    res.status(200).json({
        status:"success",
        results:projects.length,
        data:projects
    })  
})


const archiveProject = asyncHandler(async (req,res) => {
    /*
    user-> auth , company, role
    projectid-> exist ,company,archive , 
    */
    const {projectId,archived} = req.body;
    const user = req.user;
    if(!user){
        throw new ApiError(401,"User not authenticated");
    }

    if(!user.companyId){
        throw new ApiError(400,"User does not belong to any company");
    }
    const company = await Company.findById(user.companyId)
    if(!company){
        throw new ApiError(404,"Company not found");
    }

    if(user._id.toString()!== company.createdBy.toString()){
        throw new ApiError(403,"Only company owner can archive projects");
    }

   if (!projectId || typeof archived !== "boolean") {
        throw new ApiError(400, "Project ID and valid archived status are required");
   }

   
    const project = await Project.findOneAndUpdate(
        { _id: projectId, companyId: user.companyId },
        { archived: archived },
        { new: true }
    );
    if(!project){
        throw new ApiError(404,"Project not found or does not belong to your company");
    }

    res.status(200).json({
        status:"success",
        message:"Project archived successfully",
        data:project
    })
})


const getArchiveProjects = asyncHandler(async (req,res) => {    
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
        throw new ApiError(403,"Only company owner can view all projects");
    }   

    const projects = await Project.find({companyId:user.companyId,archived:true});    
    res.status(200).json({
        status:"success",
        results:projects.length,
        data:projects
    })  
})


const addEmployee = asyncHandler(async (req,res) => {

    /*
    user auth -> role , basic auth,
    emp id -> auth , company , project,

    */
    const {empId,projectId} = req.body;
    const user = req.user;

    if(!user){
        throw new ApiError(401,"User not authenticated");
    }
    if(!user.companyId){
        throw new ApiError(400,"User does not belong to any company");
    }
    const company =  await Company.findById(user.companyId);
    if(!company){
        throw new ApiError(404,"Company not found");
    }

    const projectMember = await ProjectMember.findOne({userId:user._id,projectId,role:{$in:["admin","manager"]}});
    if(!projectMember){ 
        throw new ApiError(403,"Only project admin or manager can add employees to the project");
    }

    const project = await Project.findById(projectId);
    if(!project){
        throw new ApiError(404,"Project not found");
    }
    if(project.companyId.toString() !== user.companyId.toString()){
        throw new ApiError(403,"You do not have permission to add employees to this project");
    }

    if(!empId){
        throw new ApiError(400,"Employee ID is required");
    }
    const employee = await User.findById(empId);
    if(!employee){
        throw new ApiError(404,"Employee not found");
    }
    if(employee.companyId.toString() !== user.companyId.toString()){
        throw new ApiError(400,"Employee does not belong to your company");
    }
 
    const isAlreadyMember = await ProjectMember.findOne({projectId,userId:empId});
    if(isAlreadyMember){
        throw new ApiError(400,"Employee is already a member of this project");
    }
    const newMember = await ProjectMember.create({projectId,userId:empId,role:"employee",companyId:user.companyId});
    if(!newMember){
        throw new ApiError(500,"Failed to add employee to the project");
    }

    res.status(200).json({
        status:"success",
        message:"Employee added to project successfully",
        data:newMember
    })




})

const removeEmployee = asyncHandler(async (req,res) => {
    /*
    user -> auth(company, role)
    project -> exist, same company, 
    project member -> exist, associate with company,
    remove member (delete project member )
    send mail to that user you are removed
    */

    const {projectId, empId} = req.body;

    const user = req.user;

    if(!user){
        throw new ApiError(401,"User not authenticated");
    }

    if(!user.companyId){
        throw new ApiError(400,"User does not belong to any company");
    }

    const company = await Company.findById(user.companyId);

    if(!company){
        throw  new ApiError(404,"Company not found");
    }

    const userProjectMember = await ProjectMember.findOne({userId:user._id,projectId,role:{$in:["admin","manager"]}});
    if(!userProjectMember){
        throw new ApiError(403,"Only project admin or manager can remove employees from the project");
    }

    if(!projectId || !empId){
        throw new ApiError(400,"Project ID and Employee ID are required");
    }
    const project = await Project.findById(projectId);
    if(!project){
        throw new ApiError(404,"Project not found");
    }
    if(project.companyId.toString()!== user.companyId.toString()){
        throw new ApiError(403,"You do not have permission to remove employees from this project");
    }

    const employee =  await User.findById(empId)
    if(!employee){
        throw new ApiError(404,"Employee not found");
    }
    
    if(employee.companyId.toString()!== user.companyId.toString()){
        throw new ApiError(400,"Employee does not belong to your company");
    }

    const projectMember = await ProjectMember.deleteOne({
    companyId: company._id,
    projectId,
    userId: empId,
    })

    if (projectMember.deletedCount === 0) {
    throw new ApiError(500, "Failed to remove employee from the project");
    }


    res.status(200).json({
        status:"success",
        message:`Employee removed from project successfully by ${userProjectMember.role}`,

    })
  
})

const createProjectInvite = asyncHandler(async (req, res) => {
  const { inviteeId, projectId } = req.body;
  const user = req.user;

  if (!user) throw new ApiError(401, "User not authenticated");
  if (!user.companyId) throw new ApiError(400, "User does not belong to any company");

  const company = await Company.findById(user.companyId);
  if (!company) throw new ApiError(404, "Company not found");

  if (!inviteeId || !projectId) {
    throw new ApiError(400, "Invitee ID and Project ID are required");
  }

  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, "Project not found");

  if (project.companyId.toString() !== user.companyId.toString()) {
    throw new ApiError(403, "Project does not belong to your company");
  }

  const projectMember = await ProjectMember.findOne({
    projectId,
    userId: user._id,
  });

  if (!projectMember) {
    throw new ApiError(403, "You are not a member of this project");
  }

  if (projectMember.role !== "admin" && projectMember.role !== "manager") {
    throw new ApiError(403, "Only admin or manager can invite users to the project");
  }

  const invitee = await User.findById(inviteeId);
  if (!invitee) throw new ApiError(404, "Invitee not found");

  if (invitee.companyId.toString() !== user.companyId.toString()) {
    throw new ApiError(400, "Invitee does not belong to your company");
  }

  const projectInviteExist = await ProjectInvite.findOne({ projectId, inviteeId });
  if (projectInviteExist) {
    throw new ApiError(400, "Invite already sent to this user for this project");
  }

  const projectInvite = await ProjectInvite.create({
    projectId,
    inviteeId,
    status: "pending",
    inviterId: user._id,
    companyId:user.companyId
  });

  res.status(201).json({
    status: "success",
    message: "Project invite created successfully",
    data: projectInvite,
  });
});

const joinProject = asyncHandler(async (req, res) => {  
    /*
    user-> auth , company
    projectinviteid - input,auth ,
    pending-status;
    if(status){
    create project member 
    }
    */
    const {projectInviteId,status,reason} = req.body;
    const user = req.user;
    if(!user){
        throw new ApiError(401,"User not authenticated");
    }
    if(!user.companyId){
        throw new ApiError(400,"User does not belong to any company");
    }
    const company =  await Company.findById(user.companyId);
    if(!company){
        throw new ApiError(404,"Company not found");
    }
    if(!projectInviteId || !status){
        throw new ApiError(400,"Project Invite ID and status are required");
    }
    const projectInvite = await ProjectInvite.findById(projectInviteId);
    if(!projectInvite){
        throw new ApiError(404,"Project Invite not found");
    }
    if(projectInvite.inviteeId.toString() !== user._id.toString()  || projectInvite.companyId.toString()!==user.companyId.toString()){
        throw new ApiError(403,"You are not authorized to respond to this invite");
    }
    if(projectInvite.status !== "pending"){
        throw new ApiError(400,"You have already responded to this invite");
    }
    if(status === "accepted"){
        const projectMemberExist = await ProjectMember.findOne({projectId:projectInvite.projectId,userId:user._id});
        if(projectMemberExist){
            throw new ApiError(400,"You are already a member of this project");
        }       
        const newProjectMember = await ProjectMember.create({projectId:projectInvite.projectId,userId:user._id,role:"employee",companyId:user.companyId});
        if(!newProjectMember){
            throw new ApiError(500,"Failed to add you to the project");
        }
        projectInvite.status = "accepted";
    }
    else if(status === "rejected"){
        projectInvite.status = "rejected";
        if(!reason){throw new ApiError(400,"Reason is required")}
        projectInvite.reason = reason || null;
    }   
    else{
        throw new ApiError(400,"Invalid status value");
    }
    await projectInvite.save();
    res.status(200).json({
        status:"success",
        message:`Project invite ${status} successfully`,
        data:projectInvite
    })
})

const getProjectEmployees = asyncHandler(async (req,res) => {
    /*
    user->auth company role manager/admin
    projectId -> auth(company)
    projectMember->(auth role(manager/admin)) , fetch all employee then populate user with credentials
    */
   const {projectId} = req.body;
   const user = req.user;
   if(!user.companyId){
    throw new ApiError(400, "User does not belong to any company");
   }
   
   const company  = await Company.findById(user.companyId);
   if(!company){
    throw new ApiError(404, "Company not found");
   }

   if(!projectId){
    throw new ApiError(400, "Project ID is required");
   }
   const project = await Project.findOne({_id:projectId,companyId:user.companyId})
   if(!project){
    throw new ApiError(404, "Project not found");
   }

   const projectMember = await ProjectMember.findOne({ projectId, userId: user._id });
    if (!projectMember) throw new ApiError(403, "You are not a member of this project");

    if (!["admin", "manager"].includes(projectMember.role))
    throw new ApiError(403, "Only admin or manager can view employees");


   const projectEmployees = await ProjectMember.find({projectId,role:"employee"})
   .select("-projectId -companyId -updatedAt")
   .populate({
    path:"userId",
    select:"username email fullname profilePicUrl bio skills phone",
   })

    res.status(200).json({  
        status:"success",
        results:projectEmployees.length,
        data:projectEmployees
    }) 
})

const getemployeeProjects = asyncHandler(async (req,res) => {
    /**
      userid input;
    user-> auth company 
    project -> userid, role employee,company
     */

    const user = req.user;
    if(!user){
        throw new ApiError(401,"User not authenticated");
    }
    if(!user.companyId){
        throw new ApiError(400,"User does not belong to any company");
    }
    const company =  await Company.findById(user.companyId);
    if(!company){
        throw new ApiError(404,"Company not found");
    }

    const Projects = await ProjectMember.find({
    userId: user._id,
    companyId:user.companyId,
    role: "employee"
    })
    .populate({
    path: "projectId",
    select: "projectName description archived"
    })
    .select("projectId -_id");

    const projects = Projects.map((m)=> m.projectId);

    res.status(200).json({
        status:"success",
        results:projects.length,
        data:projects
    })

})

const getManagerProjects = asyncHandler(async (req,res) => {
    const user = req.user;
    if(!user){
        throw new ApiError(401,"User not authenticated");
    }
    if(!user.companyId){
        throw new ApiError(400,"User does not belong to any company");
    }
    const company =  await Company.findById(user.companyId);
    if(!company){
        throw new ApiError(404,"Company not found");
    }
    const Projects = await ProjectMember.find({
    userId: user._id,
    companyId:user.companyId,
    role: "manager"
    })
    .populate({
    path: "projectId",
    select: "projectName description archived"
    })
    .select("projectId -_id");

    const projects = Projects.map((m)=> m.projectId);

    res.status(200).json({
        status:"success",
        results:projects.length,
        data:projects
    })
})


export{
    createProject,
    createProjectInvite,
    joinProject,

    addEmployee,
    removeEmployee,

    getemployeeProjects,
    getManagerProjects,
    getallProjects,
    getProjectEmployees,

    getArchiveProjects,
    archiveProject
}