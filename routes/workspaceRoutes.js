import express from "express";
import {
  shareWorkspace,
  getWorkspace,
  getAllWorkspaces,
} from "../controllers/workspaceController.js";
import authMiddleware from "../middlewares/AuthMiddleware.js";

const router = express.Router();
router.put("/shareWorkspace/:email/", authMiddleware, shareWorkspace);
router.get("/getWorkspace/:workSpaceId", authMiddleware, getWorkspace);
router.get("/getAllWorkspaces", authMiddleware, getAllWorkspaces);

export default router;
