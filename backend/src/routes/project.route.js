import express from "express";
import {
  createProject,
  addEmployee,
  removeEmployee,
  createProjectInvite,
  joinProject,
  getemployeeProjects,
  getManagerProjects,
  getallProjects,
  getArchiveProjects,
  archiveProject,
  getProjectEmployees,
  reassignProjectManager
} from "../controllers/project.controller.js";

import  verifyJWT  from "../middlewares/jwt.middleware.js";
import  authorizeRoles  from "../middlewares/role.middleware.js";

const router = express.Router();

router.use(verifyJWT);

router.post("/create", authorizeRoles("admin"), createProject);
router.get("/all", authorizeRoles("admin"), getallProjects);
router.post("/archive", authorizeRoles("admin"), archiveProject);
router.get("/archived", authorizeRoles("admin"), getArchiveProjects);

router.post("/member/add", authorizeRoles("manager", "admin"), addEmployee);
router.delete("/member/remove", authorizeRoles("manager", "admin"), removeEmployee);
router.post("/employees", authorizeRoles("manager", "admin"), getProjectEmployees);

router.post("/invite", authorizeRoles("manager", "admin"), createProjectInvite);

router.post("/invite/respond", authorizeRoles("employee"), joinProject);

router.get("/my/employee", authorizeRoles("employee"), getemployeeProjects);
router.get("/my/manager", authorizeRoles("manager"), getManagerProjects);

router.post("/manager/reassign", authorizeRoles("admin"), reassignProjectManager);


export default router;
