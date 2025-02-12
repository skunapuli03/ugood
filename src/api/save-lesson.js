export default async function handler(req, res) {
  if (req.method === "POST") {
    const { journalEntry, reflection } = req.body;
    // Save to in-memory storage (in production, use a database)
    global.savedLesson = { journalEntry, reflection };
    res.status(200).json({ success: true });
  } else {
    res.status(405).json({ error: "Method Not Allowed" });
  }
}