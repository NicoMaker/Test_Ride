import { Router } from "express";
import { getCompanyInfo } from "../controllers/companyController.js";

const router = Router();
router.get("/company-info", getCompanyInfo);
export default router;
