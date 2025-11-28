// backend/routes/auth.js   ← ファイル名はそのまま！
const express = require("express");
const { getAuth } = require("firebase-admin/auth");
const jwt = require("jsonwebtoken");

const router = express.Router();

// ポートフォリオ用シークレット（本番では .env に入れてね）
const JWT_SECRET =
  "my-portfolio-2025-super-secure-jwt-secret-please-change-later";

router.post("/issue-jwt", async (req, res) => {
  const { idToken } = req.body;

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);

    const token = jwt.sign(
      { uid: decodedToken.uid, email: decodedToken.email },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.cookie("jwt", token, {
      httpOnly: true,
      secure: false, // localhost は false
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("JWT発行エラー:", error.message);
    res.status(401).json({ error: "トークン無効" });
  }
});

module.exports = router; // ← これが超重要！！
