import express from "express";
const router = express.Router();
import { renderLoginPage } from "../controllers/admin/admin.controller.js";



router.get('/', renderLoginPage);


export default router;



