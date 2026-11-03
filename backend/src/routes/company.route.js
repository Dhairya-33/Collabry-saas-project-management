import express from "express";
import { createCompany, generateCompanyInvite, getCompanyMembers, getOverview, joinCompany, reassignProjectManager, removeCompanyMember } from "../controllers/company.controller.js";
import verifyJWT from "../middlewares/jwt.middleware.js";

const router = express.Router();

router.post("/create", verifyJWT, createCompany);

router.post("/join", verifyJWT, joinCompany);

router.get("/company-invite", verifyJWT, generateCompanyInvite);

router.post("/member/remove", verifyJWT, removeCompanyMember);

router.post("/manager/reassign", verifyJWT, reassignProjectManager);

router.get("/members", verifyJWT, getCompanyMembers);

router.get("/overview", verifyJWT, getOverview);

export default router;



