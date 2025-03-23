require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const admin = require("firebase-admin");

// Khởi tạo Firebase
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// Khởi tạo Bot Telegram
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
bot.on("polling_error", (error) => console.log(error));
// Ghi nhận chi tiêu
bot.onText(/\/chi (\d+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const amount = parseInt(match[1]);
    const category = match[2];

    try {
        await db.collection("expenses").add({
            userId: chatId,
            amount,
            category,
            date: new Date(),
        });
        bot.sendMessage(chatId, `Đã lưu: ${amount} VND cho ${category}`);
    } catch (error) {
        bot.sendMessage(chatId, "Lỗi khi lưu dữ liệu!");
    }
});

// Xem báo cáo chi tiêu
bot.onText(/\/baocao/, async (msg) => {
    const chatId = msg.chat.id;
    let total = 0;
    let summary = "";

    const snapshot = await db.collection("expenses").where("userId", "==", chatId).get();

    snapshot.forEach((doc) => {
        const data = doc.data();
        total += data.amount;
        summary += `💰 ${data.amount} VND - ${data.category}\n`;
    });

    bot.sendMessage(chatId, `📊 Tổng chi tiêu: ${total} VND\n\n${summary}`);
});

// Lập kế hoạch tiết kiệm
bot.onText(/\/kehoach (\d+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const goal = parseInt(match[1]);

    await db.collection("goals").doc(`${chatId}`).set({ goal });
    bot.sendMessage(chatId, `🎯 Mục tiêu tiết kiệm: ${goal} VND đã được đặt.`);
});

// Kiểm tra tiến độ tiết kiệm
bot.onText(/\/tienbo/, async (msg) => {
    const chatId = msg.chat.id;
    const goalDoc = await db.collection("goals").doc(`${chatId}`).get();
    const expenses = await db.collection("expenses").where("userId", "==", chatId).get();

    let totalSpent = 0;
    expenses.forEach((doc) => {
        totalSpent += doc.data().amount;
    });

    if (!goalDoc.exists) {
        bot.sendMessage(chatId, "Bạn chưa đặt mục tiêu tiết kiệm!");
        return;
    }

    const goal = goalDoc.data().goal;
    const progress = goal - totalSpent;
    bot.sendMessage(chatId, `🎯 Mục tiêu: ${goal} VND\n💰 Đã chi tiêu: ${totalSpent} VND\n💵 Còn lại: ${progress} VND`);
});

// Khởi động bot
console.log("Bot đang chạy...");
