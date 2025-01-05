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

export const generateSessionId = async (req, res) => {
  try {
    const { formId } = req.params; // Get formId from request parameters
    const form = await Form.findById(formId); // Find the form by its ID

    if (form) {
      const sessionId = await generateUniqueSessionId(); // Generate a new session ID

      // Increment the viewCount for this form
      form.viewCount += 1;
      await form.save(); // Save the updated form
      // Save the new form entry with the generated sessionId

      res.status(200).json({ success: true, sessionId }); // Send the session ID back
    } else {
      res.status(404).json({ success: false, message: "Form not found" });
    }
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
export const getAllFormResponses = async (req, res) => {
  try {
    const { formId } = req.params;

    if (!formId) {
      return res.status(400).json({
        success: false,
        error: "Missing formId parameter.",
      });
    }

    // Fetch the form details
    const form = await Form.findById(formId)
      .populate("elements") // Populate elements for the form
      .exec();
    if (!form) {
      return res.status(404).json({
        success: false,
        error: "Form not found.",
      });
    }

    // Fetch form entries
    const formEntries = await FormEntry.find({ formId: formId })
      .populate("responses.elementId") // Populate responses with element details
      .exec();

    // Extract element details and map them
    const elementDetails = form.elements.map((element) => ({
      id: element._id,
      type: element.type,
      label: element.label || null,
      placeholder: element.placeholder || null,
      options: element.options || null,
    }));

    // Aggregate responses while filtering out unwanted element types
    const formattedResponses = formEntries.map((entry) => {
      const filteredResponses = entry.responses
        .filter((response) => {
          const elementType = response.elementId
            ? response.elementId.type
            : null;
          return !["Image", "Button", "Text_Bubble"].includes(elementType); // Exclude unwanted types
        })
        .map((response) => ({
          elementId: response.elementId ? response.elementId._id : null,
          label: response.elementId ? response.elementId.label : null, // Include label for easier understanding
          response: response.response || null, // Response value
        }));

      return {
        submittedAt: entry.createdAt, // Timestamp for when the entry was created
        responses: filteredResponses,
        sessionId: entry.sessionId,
      };
    });

    // Prepare the final response object
    const responseData = {
      formName: form.formName,
      views: form.viewCount || 0, // Total views for the form
      starts: form.startCount || 0, // Total starts for the form
      completedCount: form.completedCount || 0, // Total completed responses
      elements: elementDetails, // Include element details
      entries: formattedResponses, // Include filtered and formatted responses
    };

    return res.status(200).json({ success: true, data: responseData });
  } catch (err) {
    console.error("Error fetching form responses:", err);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error.",
    });
  }
};

export const addFormResponse = async (req, res) => {
  const { sessionId, formId, elementId, response } = req.body;

  // Input validation
  if (!sessionId || !formId || !elementId || !response) {
    return res.status(400).json({
      success: false,
      error:
        "Missing required fields: sessionId, formId, elementId, or response.",
    });
  }

  try {
    let formEntry = await FormEntry.findOne({ sessionId, formId });

    if (!formEntry) {
      // No form entry exists for this session and form, so create a new one
      formEntry = new FormEntry({
        sessionId,
        formId,
        responses: [
          {
            sessionId, // Track sessionId inside the responses array
            elementId,
            response,
          },
        ],
      });

      // Increment the startCount only once for the first response from the session
      const form = await Form.findById(formId);
      if (form) {
        form.startCount += 1; // Increment only the first response from this session
        await form.save();
      }
    } else {
      // Form entry exists, now check if there's any response from the session
      const existingResponse = formEntry.responses.find(
        (r) =>
          r.sessionId === sessionId &&
          r.elementId.toString() === elementId.toString()
      );

      if (existingResponse) {
        // If response already exists for this session and element, update the response
        existingResponse.response = response;
      } else {
        // Otherwise, add the new response
        formEntry.responses.push({ sessionId, elementId, response });

        // Only increment the startCount if it's the first response from the session
        const form = await Form.findById(formId);
        if (form && form.startCount === 0) {
          form.startCount += 1; // Increment the startCount once when the first response comes in
          await form.save();
        }
      }
    }

    // Save the form entry (either new or updated)
    await formEntry.save();

    // Send response back to frontend
    res.status(200).json({
      success: true,
      message: "Response recorded successfully",
      formEntry,
    });
  } catch (err) {
    console.error("Error recording form response:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

export const submitForm = async (req, res) => {
  try {
    const { sessionId, formId } = req.params;

    // Input validation
    if (!sessionId || !formId) {
      return res.status(400).json({
        error: "Missing required fields: sessionId or formId.",
      });
    }

    // 1. Get the form by formId
    const form = await Form.findOne({ _id: formId });
    if (!form) {
      return res
        .status(404)
        .json({ success: false, message: "Form not found" });
    }

    // 2. Find the sessionId in the FormEntry model
    const formEntry = await FormEntry.findOne({ sessionId, formId });
    if (!formEntry) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    // 3. Check if the form has already been completed for this session
    if (formEntry.isCompleted) {
      return res.status(400).json({
        success: false,
        message: "Form already submitted by this session.",
      });
    }

    // 4. Get the form elements and filter out the ones that don't require input
    const formElements = await Element.find({ formId }); // Find all elements for the form

    // Filter out elements that don't require user input (Image, Button, Text_Bubble)
    const requiredElements = formElements.filter(
      (el) =>
        el.type !== "Image" &&
        el.type !== "Button" &&
        el.type !== "Text_Bubble" &&
        el.required
    );

    // 5. Check if all the required elements have responses
    const missingResponses = requiredElements.some(
      (el) =>
        !formEntry.responses.some(
          (r) => r.elementId.toString() === el._id.toString()
        )
    );

    if (missingResponses) {
      return res.status(400).json({
        success: false,
        message: "Form is incomplete. Please answer all required questions.",
      });
    }

    // 6. Mark the session as completed
    formEntry.isCompleted = true;
    await formEntry.save();

    // 7. Increase the completedCount for the form
    form.completedCount += 1;
    await form.save();

    // 8. Return success response
    res.status(200).json({
      success: true,
      message: "Form submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting form:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
