import Folder from "../models/folder.js";
import Form from "../models/form.js";
import User from "../models/user.js";
import Workspace from "../models/workSpace.js";

import mongoose from "mongoose";
export const validateObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

export const create = async (req, res) => {
  try {
    const { folderId, formName } = req.body;
    const userId = req.user._id;

    if (!formName) {
      return res
        .status(400)
        .json({ success: false, message: "Missing form name" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    let folder = null;
    if (folderId) {
      folder = await Folder.findById(folderId);
      if (!folder) {
        return res
          .status(404)
          .json({ success: false, message: "Folder not found" });
      }
    }

    const newForm = new Form({
      createdBy: req.user._id,
      workspace: user.workspaceId,
      formName,
      elements: [],
    });
    await newForm.save();

    if (folderId) {
      folder.forms.push(newForm._id);
      await folder.save();
    }

    const workspace = await Workspace.findOne({ createdBy: userId });
    if (workspace) {
      workspace.forms.push(newForm._id);
      await workspace.save();
    }

    return res.status(201).json({
      success: true,
      message: "Form created successfully",
      data: newForm,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const deleteForm = async (req, res) => {
  try {
    const { formId } = req.params;
    if (!formId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing form ID" });
    }
    const form = await Form.findById(formId);
    if (!form) {
      return res
        .status(404)
        .json({ success: false, message: "Form not found" });
    }
    const user = await User.findById(req.user._id);
    if (!user || user._id.toString() !== form.createdBy.toString()) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized to delete this form" });
    }
    await form.remove();
    res.json({ success: true, message: "Form deleted successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getAll = async (req, res) => {
  try {
    const userId = req.user._id; // Get the logged-in user's ID
    const workspaceId = req.params.workspaceId; // Get the workspaceId from the URL params

    // Validate userId and workspaceId
    if (!validateObjectId(userId) || !validateObjectId(workspaceId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid IDs provided" });
    }

    // Ensure the user exists
    const user = await User.findById(userId).populate("sharedWorkspaces");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    let isSharedWorkspace = false;

    // First, check if the user owns the workspace
    const isWorkspaceOwner = await Workspace.findOne({
      _id: workspaceId,
      createdBy: userId, // Check if the workspace was created by the user
    });

    if (isWorkspaceOwner) {
      isSharedWorkspace = false; // The user owns the workspace, so it's not shared
    } else {
      // If the user does not own the workspace, check if it's shared with the user
      const isWorkspaceShared = user.sharedWorkspaces.some(
        (workspace) => workspace._id.toString() === workspaceId.toString()
      );

      if (isWorkspaceShared) {
        isSharedWorkspace = true;
      } else {
        return res.status(404).json({
          success: false,
          message: "Workspace not found or not shared with user",
        });
      }
    }

    // Fetch all forms in the workspace (whether owned or shared)
    const forms = await Form.find({ workspace: workspaceId });

    // Return the forms along with the isSharedWorkspace flag
    res.json({
      success: true,
      forms,
      isSharedWorkspace,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const createFormInFolder = async (req, res) => {
  try {
    const { workspaceId, folderId, formName } = req.body;

    if (!formName || !workspaceId || !folderId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing form name" });
    }
    const user = await User.findById(req.user._id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res
        .status(404)
        .json({ success: false, message: "Folder not found" });
    }
    if (folder.createdBy.toString() !== user._id.toString()) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized to create form in this folder",
      });
    }

    const newForm = new Form({
      createdBy: req.user._id,
      workspace: workspaceId,
      formName,
      elements: [],
    });
    await newForm.save();
    folder.forms.push(newForm._id);
    await folder.save();
    return res.status(201).json({
      success: true,
      message: "Form created successfully",
      data: newForm,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
