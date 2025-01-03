import Element from "../models/element.js";
import Folder from "../models/folder.js";
import Form from "../models/form.js";
import User from "../models/user.js";
import Workspace from "../models/workSpace.js";
import { v7 as uuidv7 } from "uuid";

import mongoose from "mongoose";
import FormEntry from "../models/formEntry.js";
export const validateObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

export const create = async (req, res) => {
  try {
    const { formName } = req.body;
    const { workspaceId } = req.params; // Get workspaceId from params
    const userId = req.user._id;

    if (!formName) {
      return res
        .status(400)
        .json({ success: false, message: "Missing form name" });
    }

    const user = await User.findById(userId).populate("sharedWorkspaces");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    let accessLevel = "view"; // Default access level if not owner or shared with "edit"

    // Check if the workspaceId belongs to the user (owner of the workspace)
    const isWorkspaceOwner = await Workspace.findOne({
      _id: workspaceId,
      createdBy: userId, // Check if the workspace was created by the user
    });

    if (isWorkspaceOwner) {
      // The user is the owner, so they have "edit" rights
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

    // If the user does not have "edit" rights in this workspace, return an error
    if (accessLevel !== "edit") {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to create forms in this workspace",
      });
    }

    // Create the new form directly in the workspace
    const newForm = new Form({
      createdBy: userId,
      workspace: workspaceId, // Assign to the requested workspace
      formName,
      elements: [],
    });

    await newForm.save();

    // Add the form to the workspace's forms array
    const workspace = await Workspace.findById(workspaceId);
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
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const deleteForm = async (req, res) => {
  try {
    const { workspaceId, folderId, formId } = req.params;

    if (!workspaceId || !formId) {
      return res.status(400).json({
        success: false,
        message: "Missing workspaceId or formId",
      });
    }

    let accessLevel = "view"; // Default access level

    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found, not authorized to delete the form",
      });
    }

    // Check if the user is the owner of the workspace
    const isWorkspaceOwner = await Workspace.findOne({
      _id: workspaceId,
      createdBy: userId,
    });

    if (isWorkspaceOwner) {
      accessLevel = "edit"; // Owner gets "edit" access
    } else {
      // Check if the workspace is shared and get the access level
      const sharedWorkspace = user.sharedWorkspaces.find(
        (workspace) =>
          workspace.workspaceId.toString() === workspaceId.toString()
      );
      if (sharedWorkspace) {
        accessLevel = sharedWorkspace.accessLevel;
      }
    }

    // Only users with "edit" access can delete forms
    if (accessLevel !== "edit") {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this form",
      });
    }

    let form;
    let formDeleted = false;

    // Check if folderId is provided and handle accordingly
    if (folderId) {
      // Find the folder and ensure the form exists within it
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

      // Check if the form exists in the folder
      const formIndex = folder.forms.indexOf(formId);
      if (formIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Form not found in the specified folder",
        });
      }

      // Remove the form from the folder's forms array
      folder.forms.splice(formIndex, 1);
      await folder.save(); // Save the updated folder

      formDeleted = true;
    } else {
      // If no folderId is provided, check the workspace forms array
      const workspace = await Workspace.findById(workspaceId);

      if (!workspace) {
        return res.status(404).json({
          success: false,
          message: "Workspace not found",
        });
      }

      // Check if the form exists in the workspace forms array
      const workspaceFormIndex = workspace.forms.indexOf(formId);
      if (workspaceFormIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Form not found in the workspace",
        });
      }

      // Remove the form from the workspace's forms array
      workspace.forms.splice(workspaceFormIndex, 1);
      await workspace.save(); // Save the updated workspace

      formDeleted = true;
    }

    // Delete the form document itself after removing it from the array
    if (formDeleted) {
      form = await Form.findById(formId);
      if (form) {
        await form.deleteOne(); // Delete the form
      } else {
        return res.status(404).json({
          success: false,
          message: "Form not found",
        });
      }
    }

    return res.json({
      success: true,
      message: "Form deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getAll = async (req, res) => {
  try {
    const userId = req.user._id; // Get the logged-in user's ID
    const workspaceId = req.params.workspaceId; // Get the workspaceId from the URL params
    const folderId = req.params.folderId; // Get folderId from URL params (optional)

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
    let accessLevel = "edit"; // Default access level for the user's own workspace

    // First, check if the user owns the workspace
    const isWorkspaceOwner = await Workspace.findOne({
      _id: workspaceId,
      createdBy: userId, // Check if the workspace was created by the user
    });

    if (isWorkspaceOwner) {
      isSharedWorkspace = false; // The user owns the workspace, so it's not shared
    } else {
      // If the user does not own the workspace, check if it's shared with the user
      const sharedWorkspace = user.sharedWorkspaces.find(
        (workspace) =>
          workspace.workspaceId.toString() === workspaceId.toString()
      );

      if (sharedWorkspace) {
        isSharedWorkspace = true;
        accessLevel = sharedWorkspace.accessLevel; // Set the access level from the shared workspace
      } else {
        return res.status(404).json({
          success: false,
          message: "Workspace not found or not shared with user",
        });
      }
    }

    // Prepare query to fetch forms
    let formsQuery = { workspace: workspaceId };

    // If folderId is provided, filter forms by folderId
    if (folderId) {
      if (!validateObjectId(folderId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid folderId provided" });
      }
      // Fetch forms only from the specific folder
      formsQuery.folderId = folderId;
    } else {
      // If no folderId is provided, only fetch forms that are not in any folder
      formsQuery.folderId = null; // Forms not inside any folder
    }

    // Fetch forms based on the query and populate elements
    const forms = await Form.find(formsQuery)
      .populate("elements") // Populate the elements array with full Element data
      .exec(); // Execute the query

    // Prepare response payload
    const responsePayload = {
      success: true,
      forms,
      isSharedWorkspace,
      accessLevel, // Include the access level if shared or "edit" for owner
    };

    // Include folderId in the response if it's queried by folderId
    if (folderId) {
      responsePayload.folderId = folderId;
    }

    // Return the forms along with the isSharedWorkspace flag and accessLevel
    return res.json(responsePayload);
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
    const { workspaceId, folderId } = req.params; // Get workspaceId and folderId from URL params
    const { formName } = req.body; // Get formName from the request body

    if (!formName || !workspaceId || !folderId) {
      return res.status(400).json({
        success: false,
        message: "Missing form name, workspaceId, or folderId",
      });
    }

    // Fetch the user from the request
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if the workspace exists
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    // Default accessLevel is 'view'
    let accessLevel = "view";

    // Check if the user is the owner of the workspace
    const isWorkspaceOwner =
      workspace.createdBy.toString() === user._id.toString();

    if (isWorkspaceOwner) {
      // If the user is the owner, they automatically have "edit" access
      accessLevel = "edit";
    } else {
      // Check if the workspace is shared with the user
      const sharedWorkspace = user.sharedWorkspaces.find(
        (shared) => shared.workspaceId.toString() === workspaceId.toString()
      );

      if (sharedWorkspace) {
        // Set the access level based on the shared workspace
        accessLevel = sharedWorkspace.accessLevel;
      }
    }

    // Check if the folder exists
    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: "Folder not found",
      });
    }

    // Check if the folder belongs to the requested workspace
    if (folder.workspace.toString() !== workspaceId) {
      return res.status(403).json({
        success: false,
        message: "The folder does not belong to the requested workspace",
      });
    }

    // Check if the user has permission to create the form in the folder
    if (
      folder.createdBy.toString() !== user._id.toString() &&
      accessLevel !== "edit"
    ) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized to create form in this folder",
      });
    }

    // Proceed to create the form, associating with the folder
    const newForm = new Form({
      createdBy: req.user._id,
      workspace: workspaceId,
      folderId, // Link the form to the folder
      formName,
      elements: [],
    });

    await newForm.save();

    // Add the form to the folder's forms array
    folder.forms.push(newForm._id);
    await folder.save();

    return res.status(201).json({
      success: true,
      message: "Form created successfully",
      data: newForm,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const saveFormElements = async (req, res) => {
  try {
    const { formId, elements } = req.body;

    // Map through each element and ensure they exist or create new ones
    const updatedElementIds = [];

    for (let element of elements) {
      // If the element type is 'Image', check if a link is provided
      if (element.type === "Image" && element.link) {
        console.log("Saving Image with link:", element.link); // Log the link to ensure it's correct
      }

      // Check if the element already exists, otherwise create it
      let existingElement = await Element.findOne({ id: element.id });

      if (!existingElement) {
        // Create a new element if it doesn't exist
        const newElement = new Element({
          id: element.id,
          type: element.type,
          label: element.label,
          options: element.options || [],
          required: element.required || false,
          placeholder: element.placeholder,
          value: element.value,
          formId: formId,
          link: element.type === "Image" ? element.link : undefined, // Store the link only if the type is "Image"
        });

        console.log("New Element to Save:", newElement); // Debug log

        // Save the new element to the database
        await newElement.save();
        updatedElementIds.push(newElement._id); // Push the new Element ID
      } else {
        // Update the existing element if it exists
        // Only update if the link has changed or if other fields have changed
        const updatedFields = {};

        // Update link if the element is an Image and link has changed
        if (element.type === "Image" && element.link !== existingElement.link) {
          updatedFields.link = element.link;
          console.log("Updating Image link to:", element.link); // Log the updated link
        }

        // Update other fields (optional)
        if (element.label !== existingElement.label) {
          updatedFields.label = element.label;
        }
        if (
          element.options &&
          JSON.stringify(element.options) !==
            JSON.stringify(existingElement.options)
        ) {
          updatedFields.options = element.options;
        }
        if (element.required !== existingElement.required) {
          updatedFields.required = element.required;
        }
        if (element.placeholder !== existingElement.placeholder) {
          updatedFields.placeholder = element.placeholder;
        }
        if (element.value !== existingElement.value) {
          updatedFields.value = element.value;
        }

        // If any fields have been updated, apply the changes to the existing element
        if (Object.keys(updatedFields).length > 0) {
          await Element.findByIdAndUpdate(existingElement._id, updatedFields, {
            new: true,
          });
          console.log(
            "Updated existing element with new fields:",
            updatedFields
          ); // Debug log
        }

        updatedElementIds.push(existingElement._id); // Push the existing Element ID
      }
    }

    // Find the form by ID and update its elements field with the element ObjectIds
    const form = await Form.findByIdAndUpdate(
      formId,
      { elements: updatedElementIds },
      { new: true }
    );

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Form not found",
      });
    }

    return res.json({
      success: true,
      message: "Form elements saved successfully",
      form,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getFormElements = async (req, res) => {
  try {
    const { formId } = req.params;

    const form = await Form.findById(formId).populate("elements").exec();

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Form not found",
      });
    }

    return res.json({
      success: true,
      message: "Form elements retrieved successfully",
      form,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// API to generate and return a unique session ID
export const generateSessionId = async (req, res) => {
  try {
    const sessionId = await generateUniqueSessionId();
    res.status(200).json({ success: true, sessionId });
  } catch (error) {
    console.error("Error generating session ID", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to generate session ID" });
  }
};

// Function to generate a unique session ID
const generateUniqueSessionId = async () => {
  let sessionId;
  let isUnique = false;

  while (!isUnique) {
    // Generate a random UUID
    sessionId = uuidv7();

    // Check if sessionId already exists in the database
    const existingEntry = await FormEntry.findOne({ sessionId });

    // If no entry exists with the sessionId, it's unique
    if (!existingEntry) {
      isUnique = true;
    }
  }

  return sessionId;
};
