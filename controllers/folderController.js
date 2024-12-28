import Folder from "../models/folder.js";
import User from "../models/user.js";
import Workspace from "../models/workSpace.js";

export const getAll = async (req, res) => {
  try {
    const userId = req.user._id; // Getting the logged-in user's ID
    const workspaceId = req.params.workspaceId; // The workspace ID to fetch folders for

    // Ensure the user is found
    const user = await User.findById(userId).populate("sharedWorkspaces"); // Make sure to populate sharedWorkspaces

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    let data = [];
    let isSharedWorkspace = false;

    // Check if the workspace belongs to the user (owner of the workspace)
    const findWorkspace = await User.findOne({
      _id: userId,
      workspaceId: workspaceId, // Checking if the workspace is part of the user's workspaces
    });

    if (findWorkspace) {
      // Fetch folders for workspace if the user owns it
      const findFolders = await Folder.find({
        workspace: workspaceId,
        createdBy: userId, // Only fetch folders created by this user (owner)
      });

      data = findFolders;
    } else {
      // Check if the workspace is shared with the user

      const isWorkspaceShared = user.sharedWorkspaces.some(
        (workspace) => workspace._id.toString() === workspaceId.toString()
      );

      if (isWorkspaceShared) {
        isSharedWorkspace = true;
        // If the workspace is shared, fetch all folders within the shared workspace
        const findFolders = await Folder.find({
          workspace: workspaceId,
        });
        data = findFolders;
      } else {
        return res
          .status(404)
          .json({ success: false, message: "Workspace/Folders not found" });
      }
    }

    // Respond with folders and whether it's a shared workspace
    res.json({
      success: true,
      folders: data,
      isSharedWorkspace: isSharedWorkspace,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const create = async (req, res) => {
  try {
    const { folderName } = req.body;
    if (!folderName) {
      return res
        .status(400)
        .json({ success: false, message: "Missing folder name" });
    }
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const folder = new Folder({
      folderName,
      createdBy: userId,
      workspace: user.workspaceId,
    });
    await folder.save();
    const workspace = await Workspace.findOne({
      createdBy: userId,
    });
    workspace.folders.push(folder._id);
    await workspace.save();

    res.json({ success: true, folder, message: "Folder saved successfully" });
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const deleteFolder = async (req, res) => {
  try {
    const { folderId } = req.params;

    const userId = req.user._id;

    const folder = await Folder.findById(folderId);

    if (!folder) {
      return res
        .status(404)
        .json({ success: false, message: "Folder not found" });
    }

    if (folder.createdBy.toString() !== userId.toString()) {
      return res.status(404).json({
        success: false,
        message: "Unauthorized to delete this folder",
      });
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
