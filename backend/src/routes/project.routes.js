import express from "express";
import {
  createProject,
  getallProjects,
  getArchiveProjects,
  archiveProject,
} from "../controllers/project.controller.js";
import  verifyJWT  from "../middlewares/jwt.middleware.js";
import  authorizeRoles  from "../middlewares/role.middleware.js";

const router = express.Router();

router.use(verifyJWT);

router.post("/create", authorizeRoles("admin"), createProject);
router.get("/all", authorizeRoles("admin"), getallProjects);
router.post("/archive", authorizeRoles("admin"), archiveProject);
router.get("/archived", authorizeRoles("admin"), getArchiveProjects);
