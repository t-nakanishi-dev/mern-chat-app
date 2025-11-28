// backend/models/GroupMember.js
const mongoose = require("mongoose");

const GroupMemberSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
    required: true,
  },
  userId: { type: String, ref: "User", required: true },
  isAdmin: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  isMuted: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now },
});

// ⭐ここから追加（重複参加防止＋爆速取得）
GroupMemberSchema.index({ groupId: 1, userId: 1 }, { unique: true }); // 1人1グループ1回だけ参加
GroupMemberSchema.index({ userId: 1 }); // マイページの参加グループ一覧が速くなる
// ⭐追加ここまで

module.exports = mongoose.model("GroupMember", GroupMemberSchema);
