import mongoose from "mongoose";

const folderSchema = new mongoose.Schema(
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
    folderName: { type: String, required: true },
    forms: [{ type: mongoose.Schema.Types.ObjectId, ref: "Form" }],
  },
  { timestamps: true }
);

const Folder = mongoose.model("Folder", folderSchema);
export default Folder;
