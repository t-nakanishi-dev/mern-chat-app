// backend/models/User.js
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  _id: String, // Firebase UID をそのまま _id に
  name: { type: String, required: true },
  email: { type: String, required: true },
  iconUrl: { type: String },
  bio: { type: String },
  updatedAt: { type: Date, default: Date.now },
});

UserSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("User", UserSchema);
