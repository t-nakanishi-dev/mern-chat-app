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

// ⭐ここから追加（これだけで100万メッセージでも爆速い！）
MessageSchema.index({ group: 1, createdAt: -1 }); // チャット取得が爆速になる神インデックス
MessageSchema.index({ group: 1 }); // グループ削除時などに便利
// ⭐追加ここまで

// text, fileUrl gifQuery のどれかは必須
MessageSchema.path("text").validate(function (v) {
  return v || this.fileUrl || this.gifQuery;
}, "Message must have either text, fileUrl, or gifQuery");

module.exports = mongoose.model("Message", MessageSchema);
