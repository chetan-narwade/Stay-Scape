const Groq = require("groq-sdk");
const Listing = require("../models/listing");
const wrapAsync = require("../utils/wrapAsync");




const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

module.exports.renderChatbot = wrapAsync(async(req, res) => {
    res.render("listings/chat");
});


module.exports.getChatbotReply = wrapAsync(async (req, res) => {
    try {

        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ reply: "Message is required" });
        }

        // 🔹 Get your real project data (RAG)
        const listings = await Listing.find()
            .select("title price location category")
            .limit(8)
            .lean();

        const systemPrompt = `
You are Stay Scape's official chatbot.

You must ONLY answer using the data provided below.
Never guess.
Never create fake prices or fake locations.

You help only with:
- listings
- prices
- locations
- booking steps
- cancellation rules

If the answer is not in the data, reply exactly:
"Sorry, I do not have that information right now."

Reply in short bullet points.
`;

        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            temperature: 0.2,
            messages: [
                {
                    role: "system",
                    content:
                        systemPrompt +
                        "\n\nDATA:\n" +
                        JSON.stringify(listings)
                },
                {
                    role: "user",
                    content: message
                }
            ]
        });

        const reply =
            completion.choices[0]?.message?.content ||
            "Sorry, I could not generate a reply.";

        res.json({ reply });

    } catch (err) {
        console.error("Chatbot error:", err);
        res.status(500).json({ reply: "Chatbot server error" });
    }
});