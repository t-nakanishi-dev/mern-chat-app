// backend/routes/user.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Group = require("../models/Group");
const GroupMember = require("../models/GroupMember");

/**
 * 🔹 ユーザー登録 or Mongo保証
 * Firebase UID を受け取り、Mongo にユーザーがなければ作成
 * 既存なら更新はせずそのまま返す
 */
router.post("/", async (req, res) => {
  try {
    const { _id, name, email } = req.body;

    if (!_id || !name || !email) {
      return res.status(400).json({ message: "ID, 名前, メールは必須です" });
    }

    // MongoDB に存在確認。なければ作成
    const user = await User.findById(_id);
    if (user) {
      // すでに存在する場合はそのまま返す
      return res.status(200).json(user);
    }

    // 新規作成
    const newUser = new User({ _id, name, email });
    await newUser.save();

    res.status(201).json(newUser);
  } catch (err) {
    console.error("User POST error:", err);
    res.status(500).json({ message: "ユーザー登録に失敗しました" });
  }
});

/**
 * 🔹 ユーザー情報取得
 */
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user)
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    res.json(user);
  } catch (err) {
    console.error("User GET error:", err);
    res.status(500).json({ message: "ユーザー取得に失敗しました" });
  }
});

/**
 * 🔹 ユーザー情報更新（PATCH）
 */
router.patch("/:id", async (req, res) => {
  try {
    const { name, iconUrl, bio } = req.body;

    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ message: "ユーザーが見つかりません" });

    if (name !== undefined && name.trim() !== "") user.name = name;
    if (iconUrl !== undefined) user.iconUrl = iconUrl;
    if (bio !== undefined) user.bio = bio;

    await user.save();

    res.json(user);
  } catch (err) {
    console.error("User PATCH error:", err);
    res.status(500).json({ message: "ユーザー更新に失敗しました" });
  }
});

/**
 * 🔹 管理者権限のあるグループ一覧取得
 */
router.get("/:id/admin-groups", async (req, res) => {
  try {
    const userId = req.params.id;

    const adminMemberships = await GroupMember.find({
      userId,
      isAdmin: true,
    }).lean();

    if (adminMemberships.length === 0) return res.json([]);

    const groupIds = adminMemberships.map((m) => m.groupId);
    const adminGroups = await Group.find({ _id: { $in: groupIds } }).lean();

    res.json(adminGroups);
  } catch (err) {
    console.error("Admin groups GET error:", err);
    res.status(500).json({ message: "管理者グループの取得に失敗しました" });
  }
});

module.exports = router;
