import express from "express";
import { create, deleteFolder } from "../controllers/folderController.js";
import authMiddleware from "../middlewares/AuthMiddleware.js";

const router = express.Router();

router.post("/create", authMiddleware, create);
router.delete("/delete/:folderId", authMiddleware, deleteFolder);

export default router;
