export default async function handler(req, res) {
  if (req.method === "GET") {
    // Retrieve the saved lesson
    if(global.savedLesson) {
      res.status(200).json(global.savedLesson);
    } else {
      res.status(404).json({ error: "No lesson found" });
    }
  } else {
    res.status(405).json({ error: "Method Not Allowed" });
  }
}