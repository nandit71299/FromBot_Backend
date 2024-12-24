import Folder from "../models/folder.js";
import User from "../models/user.js";

export const getAll = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    const workspaceId = req.params.workspaceId;
    let isSharedWorkspace = false;
    let data;
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const findWorkspace = await User.findOne({ workspaceId: workspaceId });
    if (!findWorkspace) {
      const findSharedWorkspace = await User.findOne({
        sharedWorkspaces: workspaceId,
      });
      if (!findSharedWorkspace) {
        return res
          .status(404)
          .json({ success: false, message: "Workspace/Folders not found" });
      }
      isSharedWorkspace = true;
      const findFolders = await Folder.find({
        workspace: workspaceId,
      });
      data = findFolders;
    } else {
      const findFolders = await Folder.find({
        workspace: workspaceId,
        createdBy: userId,
      });
      data = findFolders;
    }
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
