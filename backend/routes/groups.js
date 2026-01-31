// backend/routes/groups.js
const express = require("express");
const router = express.Router();
const Group = require("../models/Group");
const GroupMember = require("../models/GroupMember");
const Message = require("../models/Message");
const User = require("../models/User");

// -----------------------------
// POST /api/groups
// グループ作成 (通常 or 個人チャット)
// -----------------------------
router.post("/", async (req, res) => {
  try {
    const { name, members, createdBy, type } = req.body;

    if (!members || members.length === 0) {
      return res.status(400).json({ message: "メンバーが必要です" });
    }

    if (!createdBy) {
      return res.status(400).json({ message: "作成者は必須です" });
    }

    // -----------------------------
    // 重複グループチェック
    // -----------------------------
    // 全ての候補グループを取得（メンバーが含まれるグループ）
    const candidateGroupIds = await GroupMember.find({
      userId: { $in: members },
    }).distinct("groupId");

    // 完全一致するグループを検索
    const existingGroup = await Group.findOne({
      _id: { $in: candidateGroupIds },
      type: type || "group",
    }).lean();

    if (existingGroup) {
      // メンバー数も一致しているかチェック
      const existingMembers = await GroupMember.find({
        groupId: existingGroup._id,
      }).distinct("userId");

      if (
        existingMembers.length === members.length &&
        members.every((m) => existingMembers.includes(m))
      ) {
        return res.status(200).json(existingGroup);
      }
    }

    // -----------------------------
    // 新規グループ作成
    // -----------------------------
    const group = new Group({
      name: type === "private" ? "Private Chat" : name,
      createdBy,
      type: type || "group",
    });
    await group.save();

    // GroupMemberに登録
    // 元々members配列に入っているメンバーに加えて、createdBy（グループ作成者）を必ず追加する
    // Setを使って重複を排除
    const allMembers = [...new Set([...members, createdBy])];

    const memberDocs = allMembers.map((uid) => ({
      groupId: group._id,
      userId: uid,
      isAdmin: uid === createdBy, // 作成者を管理者に設定
    }));
    await GroupMember.insertMany(memberDocs);

    // 作成したグループに displayName を持たせて返却する
    let displayName = group.name;

    if (group.type === "private") {
      // 自分（createdBy）以外のメンバーを探して名前を取得
      const otherUserId = members.find((m) => m !== createdBy);
      const otherUser = await User.findById(otherUserId).lean();
      if (otherUser) {
        displayName = otherUser.name;
      }
    }

    // クライアントに返すデータを整形
    const groupData = {
      ...group._doc,
      displayName, // 👈 これを足すことで即座に名前が表示される
      unreadCount: 0,
    };

    console.log("✨ New group created with displayName:", displayName);
    res.status(201).json(groupData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "グループ作成に失敗しました" });
  }
});

// -----------------------------
// GET /api/groups?userId=xxx
// 自分が所属するグループ (未読件数付き)
// -----------------------------
router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: "userId が必要です" });

    // 1. 自分が所属しているグループのID一覧を取得
    const memberships = await GroupMember.find({
      userId,
      isBanned: false,
    }).lean();

    const groupIds = memberships.map((m) => m.groupId);
    console.log(`🔎 ユーザー ${userId} の所属グループID一覧:`, groupIds);

    // 2. グループ本体の情報を取得
    const groups = await Group.find({ _id: { $in: groupIds } }).lean();

    // 3. 各グループごとに詳細情報を付与
    const groupsWithDetails = await Promise.all(
      groups.map(async (group) => {
        // 未読カウント
        const unreadCount = await Message.countDocuments({
          group: group._id,
          readBy: { $ne: userId },
          sender: { $ne: userId },
        });

        let displayName = group.name;

        // 個人チャットの名前解決
        if (group.type === "private") {
          // そのグループの全メンバーを取得して、自分じゃない方を抽出
          const allMembers = await GroupMember.find({ groupId: group._id })
            .populate("userId", "name")
            .lean();

          const other = allMembers.find(
            (m) => m.userId && String(m.userId._id) !== String(userId),
          );

          if (other && other.userId) {
            displayName = other.userId.name;
            console.log(`✅ Group ${group._id} の表示名を決定: ${displayName}`);
          } else {
            displayName = "個人チャット(相手不在)";
          }
        }

        return {
          ...group,
          unreadCount,
          displayName, // これをフロント側が見る
        };
      }),
    );

    res.json(groupsWithDetails);
  } catch (err) {
    console.error("❌ グループ一覧取得エラー:", err);
    res.status(500).json({ message: "グループ取得に失敗しました" });
  }
});

// -----------------------------
// GET /api/groups/search-users?q=文字列
// -----------------------------
router.get("/search-users", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const users = await User.find({
      $or: [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
    }).limit(10);

    res.json(users.map((u) => ({ _id: u._id, name: u.name, uid: u._id })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "ユーザー検索に失敗しました" });
  }
});

// -----------------------------
// DELETE /api/groups/:id
// 作成者のみ削除可能
// -----------------------------
router.delete("/:id", async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group)
      return res.status(404).json({ message: "グループが見つかりません" });

    if (group.createdBy !== userId) {
      return res.status(403).json({ message: "作成者のみ削除可能です" });
    }

    await Message.deleteMany({ group: group._id });
    await GroupMember.deleteMany({ groupId: group._id });
    await Group.findByIdAndDelete(group._id);

    res.json({ message: "グループと関連データを削除しました" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "削除に失敗しました" });
  }
});

// -----------------------------
// PATCH /api/groups/:id/members
// メンバー追加/削除 / BAN / MUTE / 管理者権限変更
// -----------------------------
router.patch("/:id/members", async (req, res) => {
  try {
    const { userId, targetUserId, action } = req.body;
    const groupId = req.params.id;

    const operator = await GroupMember.findOne({ groupId, userId });
    if (!operator?.isAdmin) {
      return res.status(403).json({ message: "管理者権限が必要です" });
    }

    let target = await GroupMember.findOne({ groupId, userId: targetUserId });

    if (action === "add") {
      if (target) return res.status(400).json({ message: "既にメンバーです" });
      target = new GroupMember({ groupId, userId: targetUserId });
      await target.save();
    } else if (action === "remove") {
      if (!target)
        return res.status(404).json({ message: "メンバーが見つかりません" });
      await target.deleteOne();
    } else if (action === "ban") {
      if (!target)
        return res.status(404).json({ message: "メンバーが見つかりません" });
      target.isBanned = true;
      await target.save();
    } else if (action === "unban") {
      if (!target)
        return res.status(404).json({ message: "メンバーが見つかりません" });
      target.isBanned = false;
      await target.save();
    } else if (action === "mute") {
      if (!target)
        return res.status(404).json({ message: "メンバーが見つかりません" });
      target.isMuted = true;
      await target.save();
    } else if (action === "unmute") {
      if (!target)
        return res.status(404).json({ message: "メンバーが見つかりません" });
      target.isMuted = false;
      await target.save();
    } else if (action === "setAdmin") {
      if (!target)
        return res.status(404).json({ message: "メンバーが見つかりません" });
      target.isAdmin = true;
      await target.save();
    } else if (action === "removeAdmin") {
      if (!target)
        return res.status(404).json({ message: "メンバーが見つかりません" });
      target.isAdmin = false;
      await target.save();
    } else {
      return res.status(400).json({ message: "無効なアクションです" });
    }

    res.json({ message: "メンバー情報を更新しました", target });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "メンバー更新に失敗しました" });
  }
});

// -----------------------------
// GET /api/groups/:id
// グループ詳細取得（チャット画面で必要！！）
// -----------------------------
router.get("/:id", async (req, res) => {
  try {
    const groupId = req.params.id;

    // グループ本体を取得
    const group = await Group.findById(groupId).lean();
    if (!group) {
      return res.status(404).json({ message: "グループが見つかりません" });
    }

    // メンバー一覧も一緒に返す（チャットヘッダーに人数表示したいので）
    const memberDocs = await GroupMember.find({ groupId }).populate(
      "userId",
      "name",
    );

    const members = memberDocs.map((m) => ({
      _id: m._id,
      userId: {
        _id: m.userId._id,
        name: m.userId.name,
      },
      isAdmin: m.isAdmin,
      isBanned: m.isBanned,
      isMuted: m.isMuted,
    }));

    res.json({
      ...group,
      members, // ← これでチャット画面の「○人のメンバー」が表示される
      memberCount: members.length, // ← なくてもいいけど便利
    });
  } catch (err) {
    console.error("グループ詳細取得エラー:", err);
    res.status(500).json({ message: "サーバーエラー" });
  }
});

// -----------------------------
// GET /api/groups/admin-groups/:userId
// 管理者が管理グループ一覧（人数付き）
// -----------------------------
router.get("/admin-groups/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // 自分が管理者のグループを取得
    const adminMemberships = await GroupMember.find({
      userId,
      isAdmin: true,
    }).lean();

    const groupIds = adminMemberships.map((m) => m.groupId);

    const groups = await Group.find({ _id: { $in: groupIds } }).lean();

    // 各グループに人数を付与
    const groupsWithCount = await Promise.all(
      groups.map(async (group) => {
        const count = await GroupMember.countDocuments({ groupId: group._id });
        return {
          ...group,
          memberCount: count,
        };
      }),
    );

    res.json(groupsWithCount);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "管理グループ取得に失敗" });
  }
});

module.exports = router;
