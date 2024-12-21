import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    workspace: {
      folders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Folder" }],
      forms: [{ type: mongoose.Schema.Types.ObjectId, ref: "Form" }],
    },

    sharedWorkspaces: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Workspace",
      },
    ],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
