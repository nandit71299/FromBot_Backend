import express from "express";
import {
  create,
  deleteForm,
  getAll,
  createFormInFolder,
} from "../controllers/formController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();
router.get("/:workspaceId/:folderId?", authMiddleware, getAll);
router.post("/create", authMiddleware, create);
router.post(
  "/create/:workspaceId/:folderId",
  authMiddleware,
  createFormInFolder
);
router.delete("/delete/:folderId", authMiddleware, deleteForm);

export default router;
