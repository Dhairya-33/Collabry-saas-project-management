import express from "express";
import {
  assignTask,
  editTask,
  deleteTask,
  myTasks,
  managerTasks,
  respondToTask,
  getSingleTask,
} from "../controllers/task.controller.js";
import verifyJWT  from "../middlewares/jwt.middleware.js";
import { multerMiddleware } from "../middlewares/multer.middleware.js"; 

const router = express.Router();


router.use(verifyJWT);

/**
 *  MANAGER / ADMIN ROUTES
 * (Manager or Admin of the project)
 */
router.post("/assign", multerMiddleware.single("file"), assignTask); // assign new task (optional file upload)
router.put("/edit/:taskId", multerMiddleware.single("file"), editTask); // edit task details or file
router.delete("/delete/:taskId", deleteTask); // delete task
router.get("/project/:projectId/manager-tasks", managerTasks); // view all employee tasks for a project

/**
 * EMPLOYEE ROUTES
 * (Employees who are assigned to tasks)
 */
router.get("/project/:projectId/my-tasks", myTasks); // employee’s own tasks in a project
router.post("/respond/:taskId", multerMiddleware.single("file"), respondToTask); // mark completed / in-progress

/**
 * SHARED ROUTE
 * (Any authorized member: admin, manager, or employee)
 */
router.get("/:taskId", getSingleTask); // get single task details

export default router;
