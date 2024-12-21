import mongoose from "mongoose";

const workspaceSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    workspaceName: { type: String, required: true },
    folders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Folder" }],
    forms: [{ type: mongoose.Schema.Types.ObjectId, ref: "Form" }],
    shareLink: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  { timestamps: true }
);

const Workspace = mongoose.model("Workspace", workspaceSchema);

export default Workspace;
