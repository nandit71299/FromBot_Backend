import mongoose from "mongoose";

const formSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    formName: { type: String, required: true },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null, // If form is not linked to a folder, default to null
    },
    elements: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Element", // Reference to the Element model
      },
    ],
    viewCount: { type: Number, default: 0 },
    startCount: { type: Number, default: 0 },
    completedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Form = mongoose.model("Form", formSchema);

export default Form;
