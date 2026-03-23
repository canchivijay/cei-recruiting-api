const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json({ limit: "15mb" }));
app.use(cors({ origin: "*" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/parse-resume", async (req, res) => {
  const { base64, jobTitle, skills } = req.body;
  if (!base64) return res.status(400).json({ error: "No PDF data" });
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: "application/pdf", data: base64 } },
              { text: `Parse this resume, return ONLY JSON:
{"name":"string","email":"string|null","phone":"string|null","currentRole":"string","totalExp":"Xy","skills":["up to 6"],"education":"string","summary":"2 sentences","fitScore":<0-100 vs ${jobTitle} needing ${(skills||[]).join(",")}>,"fitReason":"1 sentence","strengths":["2-3 items"],"redFlags":["array or empty"]}
ONLY JSON. No markdown.` }
            ]
          }]
        })
      }
    );
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    res.json({ parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
