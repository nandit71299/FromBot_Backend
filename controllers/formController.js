import Folder from "../models/folder.js";
import Form from "../models/form.js";
import User from "../models/user.js";
import Workspace from "../models/workSpace.js";

export const create = async (req, res) => {
  try {
    const { folderId, formName } = req.body;

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
    const { workspaceId, folderId } = req.params;

    if (!workspaceId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing workspace ID" });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res
        .status(404)
        .json({ success: false, message: "Workspace not found" });
    }

    if (folderId) {
      const folder = await Folder.findOne({
        _id: folderId,
        workspace: workspaceId,
      });
      if (!folder) {
        return res.status(404).json({
          success: false,
          message: "Folder not found in this workspace",
        });
      }
      const forms = await Form.find({ _id: { $in: folder.forms } });
      return res.json({ success: true, forms });
    }

    const folders = await Folder.find({ workspace: workspaceId });

    const folderFormIds = folders.flatMap((folder) => folder.forms);

    const forms = await Form.find({
      workspace: workspaceId,
      _id: { $nin: folderFormIds },
    });

    return res.json({ success: true, forms });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
