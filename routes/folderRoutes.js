import express from "express";
import {
  create,
  deleteFolder,
  getAll,
  getSingle,
} from "../controllers/folderController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/:workspaceId", authMiddleware, getAll);
router.get("/getSingle/:workspaceId/:folderId", authMiddleware, getSingle);
router.post("/create/:workspaceId", authMiddleware, create);
router.delete("/delete/:workspaceId/:folderId", authMiddleware, deleteFolder);

export default router;
