import express from "express";
import {
  create,
  deleteForm,
  getAll,
  createFormInFolder,
  saveFormElements,
  generateSessionId,
  getFormElements,
} from "../controllers/formController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();
router.post("/create/:workspaceId", authMiddleware, create);
router.post(
  "/create/:workspaceId/:folderId",
  authMiddleware,
  createFormInFolder
);

router.delete(
  "/delete/:workspaceId/:formId/:folderId?",
  authMiddleware,
  deleteForm
);

router.put("/saveformelements", authMiddleware, saveFormElements);
router.get("/getformelements/:formId", getFormElements);
router.get("/generate-session-id", generateSessionId);
router.get("/:workspaceId/:folderId?", authMiddleware, getAll);

export default router;
