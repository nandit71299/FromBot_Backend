import express from "express";
import { create, deleteForm, getAll } from "../controllers/formController.js";
import authMiddleware from "../middlewares/AuthMiddleware.js";

const router = express.Router();
router.get("/:workspaceId/:folderId?", authMiddleware, getAll);
router.post("/create", authMiddleware, create);
router.delete("/delete/:folderId", authMiddleware, deleteForm);

export default router;
