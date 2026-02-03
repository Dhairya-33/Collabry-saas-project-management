import express from "express";
import { createCompany, generateCompanyInvite, joinCompany, removeCompanyMember } from "../controllers/company.controller.js";
import verifyJWT from "../middlewares/jwt.middleware.js";

const router = express.Router();

router.post("/create", verifyJWT, createCompany);

router.post("/join", verifyJWT, joinCompany);

router.get("/company-invite", verifyJWT, generateCompanyInvite);

router.post("/member/remove", verifyJWT, removeCompanyMember);

export default router;
