import Workspace from "../models/workSpace.js";
import User from "../models/user.js";

export const shareWorkspace = async (req, res) => {
  try {
    const { email, accessLevel } = req.params;

    // Check if both email and accessLevel are provided
    if (!email || !accessLevel) {
      return res.status(400).json({
        success: false,
        message: "Please provide both email and access level.",
      });
    }

    const inviteeUserId = req.user._id;
    const inviteeUser = await User.findById(inviteeUserId);

    // Check if the invitee user exists
    if (!inviteeUser) {
      return res.status(404).json({
        success: false,
        message: "You are not authorized to perform this action.",
      });
    }

    const invitedUser = await User.findOne({ email: email });

    // Check if the invited user exists
    if (!invitedUser) {
      return res.status(404).json({
        success: false,
        message:
          "The email you are trying to share to is not registered. Please verify.",
      });
    }

    // Prevent sharing the workspace with the user themselves
    if (inviteeUserId.toString() === invitedUser._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot share your workspace with yourself.",
      });
    }

    const workspace = await Workspace.findById(inviteeUser.workspaceId);

    // Check if the workspace exists
    if (!workspace) {
      return res
        .status(404)
        .json({ success: false, message: "Workspace not found" });
    }

    // Check if the workspace is already shared with the invited user
    const isAlreadyShared = invitedUser.sharedWorkspaces.some(
      (sharedWorkspace) =>
        sharedWorkspace.workspaceId.toString() ===
        inviteeUser.workspaceId.toString()
    );

    if (isAlreadyShared) {
      return res.status(400).json({
        success: false,
        message:
          "This workspace has already been shared with the invited user.",
      });
    }

    // Add the workspace to the invited user's shared workspaces
    invitedUser.sharedWorkspaces.push({
      workspaceId: inviteeUser.workspaceId,
      accessLevel: accessLevel,
    });

    // Save the changes to the invited user's document
    await invitedUser.save();

    return res.status(200).json({
      success: true,
      message: "Workspace shared successfully",
      data: invitedUser,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
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
      !user.sharedWorkspaces.some(
        (id) => id.workspaceId.toString() === workSpaceId
      )
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
      .select(
        "workspaceId sharedWorkspaces.workspaceId sharedWorkspaces.accessLevel"
      ) // Select only workspaceId and sharedWorkspaces
      .populate({
        path: "workspaceId", // Populate the user's primary workspace with _id and workspaceName
        select: "_id workspaceName",
      })
      .populate({
        path: "sharedWorkspaces.workspaceId", // Populate shared workspaces with _id and workspaceName
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

export const shareWorkspaceViaLink = async (req, res) => {
  try {
    const { workspaceId, accessLevel } = req.body;
    const userId = req.user._id;

    // Find the user who is trying to share the workspace
    const inviteeUser = await User.findById(userId);
    if (!inviteeUser) {
      return res.status(404).json({
        success: false,
        message: "You are not authorized to perform this action.",
      });
    }

    // Find the workspace being shared
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found.",
      });
    }

    // Check if the workspace is already shared with the user
    const isWorkspaceAlreadyShared = inviteeUser.sharedWorkspaces.some(
      (sharedWorkspace) =>
        sharedWorkspace.workspaceId.toString() === workspaceId
    );
    if (isWorkspaceAlreadyShared) {
      return res.status(400).json({
        success: false,
        message: "Workspace has already been shared with you.",
      });
    }

    // Add the workspace to the sharedWorkspaces array
    inviteeUser.sharedWorkspaces.push({
      workspaceId,
      accessLevel,
    });
    await inviteeUser.save();

    // Respond with success
    return res.status(200).json({
      success: true,
      message: "Workspace shared successfully via link.",
      data: inviteeUser,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
