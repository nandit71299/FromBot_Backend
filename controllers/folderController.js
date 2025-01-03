import Folder from "../models/folder.js";
import User from "../models/user.js";
import Workspace from "../models/workSpace.js";
import mongoose from "mongoose";

export const validateObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
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

    let data = [];
    let isSharedWorkspace = false;
    let accessLevel = "edit"; // Default access level for owner's workspace

    // Check if the workspace belongs to the user (owner of the workspace)
    const isWorkspaceOwner = await Workspace.findOne({
      _id: workspaceId,
      createdBy: userId, // Check if the workspace was created by the user
    });

    if (isWorkspaceOwner) {
      // The user is the owner, so we fetch folders created by the user in this workspace
      const findFolders = await Folder.find({
        workspace: workspaceId,
      });

      data = findFolders;
      accessLevel = "edit"; // Owner gets "edit" access
    } else {
      // The workspace is not owned by the user, check if it's shared with them
      const sharedWorkspace = user.sharedWorkspaces.find(
        (workspace) =>
          workspace.workspaceId.toString() === workspaceId.toString()
      );

      if (sharedWorkspace) {
        isSharedWorkspace = true;
        accessLevel = sharedWorkspace.accessLevel; // Set accessLevel from shared workspace

        // Fetch all folders in the shared workspace
        const findFolders = await Folder.find({
          workspace: workspaceId,
        });

        // Add folders to data array
        data = findFolders;
      } else {
        return res
          .status(404)
          .json({ success: false, message: "Workspace/Folders not found" });
      }
    }

    // Respond with the folders and whether it's a shared workspace
    res.json({
      success: true,
      folders: data,
      isSharedWorkspace: isSharedWorkspace,
      accessLevel, // Include the access level for the workspace
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const create = async (req, res) => {
  try {
    const { folderName } = req.body;
    const { workspaceId } = req.params; // Get the workspaceId from URL params

    if (!folderName && !workspaceId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: folderName and workspaceId",
      });
    }

    // Validate folder name
    if (!folderName) {
      return res
        .status(400)
        .json({ success: false, message: "Missing folder name" });
    }

    const userId = req.user._id; // Get the logged-in user's ID
    const user = await User.findById(userId).populate("sharedWorkspaces");

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    let accessLevel = "view"; // Default access level (view-only)

    // Check if the workspace belongs to the user (owner of the workspace)
    const isWorkspaceOwner = await Workspace.findOne({
      _id: workspaceId,
      createdBy: userId, // Check if the workspace was created by the user
    });

    if (isWorkspaceOwner) {
      // The user is the owner, they automatically have "edit" rights
      accessLevel = "edit";
    } else {
      // The workspace is not owned by the user, check if it's shared with them
      const sharedWorkspace = user.sharedWorkspaces.find(
        (workspace) =>
          workspace.workspaceId.toString() === workspaceId.toString()
      );

      if (sharedWorkspace) {
        accessLevel = sharedWorkspace.accessLevel; // Set accessLevel from shared workspace
      }
    }

    // If the user does not have "edit" access, return an error
    if (accessLevel !== "edit") {
      return res.status(403).json({
        success: false,
        message:
          "You don't have permission to create folders in this workspace",
      });
    }

    // Proceed to create the folder
    const folder = new Folder({
      folderName,
      createdBy: userId,
      workspace: workspaceId,
    });

    await folder.save();

    // Always push the folder to the workspace's folders array (even for shared workspaces)
    const workspace = await Workspace.findById(workspaceId);
    workspace.folders.push(folder._id); // Add the folder to the workspace's folder array
    await workspace.save();

    res.json({ success: true, folder, message: "Folder created successfully" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const deleteFolder = async (req, res) => {
  try {
    const { workspaceId, folderId } = req.params;

    if (!workspaceId && !folderId) {
      return res.status(400).json({
        success: false,
        message: "Missing folderId or workspaceId",
      });
    }

    let accessLevel = "view";

    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "You are not authorized to delete this folder.",
      });
    }

    const isWorkspaceOwner = await Workspace.findOne({
      _id: workspaceId,
      createdBy: userId,
    });
    if (isWorkspaceOwner) {
      accessLevel = "edit";
    } else {
      const sharedWorkspace = user.sharedWorkspaces.find(
        (workspace) =>
          workspace.workspaceId.toString() === workspaceId.toString()
      );
      if (sharedWorkspace) {
        accessLevel = sharedWorkspace.accessLevel;
      }
    }

    if (accessLevel !== "edit") {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this folder.",
      });
    }

    const folder = await Folder.findById(folderId);

    if (!folder) {
      return res
        .status(404)
        .json({ success: false, message: "Folder not found" });
    }

    await folder.deleteOne();

    res.json({ success: true, message: "Folder deleted successfully" });
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const getSingle = async (req, res) => {
  try {
    const { folderId, workspaceId } = req.params;

    if (!folderId || !workspaceId) {
      return res.status(400).json({
        success: false,
        message: "Missing folderId or workspaceId",
      });
    }

    // Fetch the user from the database
    const user = await User.findById(req.user._id); // You can also use req.user if it's populated with user info from middleware
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if the user is authorized to access the workspace
    const isAuthorized =
      user.workspaceId.toString() === workspaceId || // Check if the workspaceId is the user's own workspace
      user.sharedWorkspaces.some((id) => id.toString() === workspaceId); // Or if the workspaceId is in sharedWorkspaces

    if (!isAuthorized) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized to view this workspace",
      });
    }

    // Fetch the folder by ID and populate the forms field with formName
    const folder = await Folder.findById(folderId).populate({
      path: "forms",
      select: "formName",
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: "Folder not found",
      });
    }

    // Respond with the folder details
    return res.status(200).json({
      success: true,
      folder,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
