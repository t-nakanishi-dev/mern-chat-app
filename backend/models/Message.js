// backend/models/Message.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MessageSchema = new Schema({
  group: { type: Schema.Types.ObjectId, ref: "Group", required: true },
  sender: { type: String, ref: "User", required: true },
  text: { type: String },
  fileUrl: { type: String },
  fileType: { type: String },
  fileName: { type: String },
  gifQuery: { type: String },
  readBy: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

MessageSchema.index({ group: 1, createdAt: -1 }); 
MessageSchema.index({ group: 1 }); 

MessageSchema.path("text").validate(function (v) {
  return v || this.fileUrl || this.gifQuery;
}, "Message must have either text, fileUrl, or gifQuery");

module.exports = mongoose.model("Message", MessageSchema);
