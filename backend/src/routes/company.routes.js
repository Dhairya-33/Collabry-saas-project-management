import express from "express";
import { createCompany, joinCompany } from "../controllers/company.controller.js";
import verifyJWT from "../middlewares/jwt.middleware.js";

const router = express.Router();

router.post("/create", verifyJWT, createCompany);

router.post("/join", verifyJWT, joinCompany);

export default router;
