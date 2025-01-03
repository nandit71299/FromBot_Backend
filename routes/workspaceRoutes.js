import express from "express";
import {
  shareWorkspace,
  getWorkspace,
  getAllWorkspaces,
  shareWorkspaceViaLink,
} from "../controllers/workspaceController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();
router.post("/shareWorkspace/link", authMiddleware, shareWorkspaceViaLink);
router.post(
  "/shareWorkspace/:email/:accessLevel",
  authMiddleware,
  shareWorkspace
);
router.get("/getWorkspace/:workSpaceId", authMiddleware, getWorkspace);
router.get("/getAllWorkspaces", authMiddleware, getAllWorkspaces);

export default router;
