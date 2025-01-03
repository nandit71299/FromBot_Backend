import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace" }, // Single workspace reference
    theme: {
      type: String,
      default: "dark",
      enum: ["dark", "light"],
    },
    sharedWorkspaces: [
      {
        workspaceId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Workspace",
        },
        accessLevel: { type: String, enum: ["edit", "view"], required: true },
      },
    ],
  },

  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
