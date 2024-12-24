import express from "express";
import { login, signup } from "../controllers/userController.js";

const router = express.Router();

router.post("/login", login);
router.post("/signup", signup);
// router.post("/updateProfle", updateProfile);
export default router;
