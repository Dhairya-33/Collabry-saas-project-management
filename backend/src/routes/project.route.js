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
  getProjectById,
  getMyProjectInvites
} from "../controllers/project.controller.js";
import verifyJWT from "../middlewares/jwt.middleware.js";

const router = express.Router();
router.use(verifyJWT);

router.post("/create", createProject);
router.get("/all", getallProjects);
router.post("/archive", archiveProject);
router.get("/archived", getArchiveProjects);

router.post("/member/add", addEmployee);
router.delete("/member/remove", removeEmployee);
router.post("/employees", getProjectEmployees);

router.post("/invite", createProjectInvite);
router.post("/invite/respond", joinProject);
router.get("/invite/my", getMyProjectInvites);

router.get("/my/employee", getemployeeProjects);
router.get("/my/manager", getManagerProjects);

// keep this LAST so it does not shadow /all, /archived, /my/*
router.get("/:projectId", getProjectById);

export default router;
