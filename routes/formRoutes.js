import express from "express";
import {
  create,
  deleteForm,
  getAll,
  createFormInFolder,
  saveFormElements,
  generateSessionId,
  getFormElements,
  getAllFormResponses,
  addFormResponse,
  submitForm,
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

router.get("/generateSessionId/:formId", generateSessionId);
router.put("/saveformelements", authMiddleware, saveFormElements);
router.get("/getformelements/:formId", getFormElements);
router.post("/addFormResponse/:formId", addFormResponse);
router.post("/submitForm/:formId/:sessionId", submitForm);
router.get("/getAllFormResponses/:formId", authMiddleware, getAllFormResponses);
router.get("/:workspaceId/:folderId?", authMiddleware, getAll);
export default router;
