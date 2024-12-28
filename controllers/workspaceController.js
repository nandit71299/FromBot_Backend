import Workspace from "../models/workSpace.js";
import User from "../models/user.js";

export const shareWorkspace = async (req, res) => {
  try {
    const { email } = req.params;
    const inviteeUserId = req.user._id;
    const inviteeUser = await User.findOne({ _id: inviteeUserId });
    if (!inviteeUser) {
      return res.status(404).json({
        success: false,
        message: "You are not authorized to perform this action.",
      });
    }
    const invitedUser = await User.findOne({ email: email });
    if (!invitedUser) {
      return res.status(404).json({
        success: false,
        message:
          "Email you are trying to share to, is not a registered email. Please verify.",
      });
    }

    const workspace = await Workspace.findById(inviteeUser.workspaceId);

    if (!workspace) {
      return res
        .status(404)
        .json({ success: false, message: "Workspace not found" });
    }

    invitedUser.sharedWorkspaces.push(inviteeUser.workspaceId);
    invitedUser.save();
    return res
      .status(200)
      .json({ success: true, message: "Workspace shared successfully" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const getWorkspace = async (req, res) => {
  try {
    const { workSpaceId } = req.params;
    const userId = req.user._id;

    // Fetch workspace from the database and populate folders and forms
    const workspace = await Workspace.findById(workSpaceId)
      .populate({
        path: "folders",
        select: "folderName", // Only select the folderName
      })
      .populate({
        path: "forms",
        select: "formName", // Only select the formName
      });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    // Fetch user from the database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (
      user.workspaceId &&
      user.workspaceId.toString() !== workSpaceId &&
      !user.sharedWorkspaces.some((id) => id.toString() === workSpaceId)
    ) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized to view this workspace",
      });
    }

    // Respond with the workspace data
    return res.status(200).json({
      success: true,
      workspace: workspace,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getAllWorkspaces = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "You are not authorized to perform this action.",
      });
    }

    // Fetch the user with their own workspace (workspaceId) and shared workspaces (sharedWorkspaces)
    const user = await User.findById(userId)
      .select("workspaceId sharedWorkspaces") // Select only workspaceId and sharedWorkspaces
      .populate({
        path: "workspaceId", // Populate the user's primary workspace with _id and workspaceName
        select: "_id workspaceName",
      })
      .populate({
        path: "sharedWorkspaces", // Populate shared workspaces with _id and workspaceName
        select: "_id workspaceName",
      });

    // If user is found, return workspaces, otherwise return an error
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Combine the user's primary workspace and their shared workspaces
    const allWorkspaces = [user.workspaceId, ...user.sharedWorkspaces];

    return res.status(200).json({
      success: true,
      message: "OK",
      workspaces: allWorkspaces, // Return combined list of workspaces
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
