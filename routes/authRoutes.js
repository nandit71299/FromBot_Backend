import express from "express";
import { login, signup } from "../controllers/userController.js";

const router = express.Router();

// Define routes
router.post("/login", login);
router.post("/", signup);

export default router;
