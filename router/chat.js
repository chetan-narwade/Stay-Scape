const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chat");

router.get("/chatbot", chatController.renderChatbot);

router.post("/", chatController.getChatbotReply);


module.exports = router;
