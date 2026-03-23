const express = require("express");
const cors    = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json({ limit: "15mb" }));
app.use(cors({ origin: "*" }));

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Resume parsing using Google Gemini
app.post("/api/parse-resume", async (req, res) => {
  const { base64, jobTitle, skills } = req.body;

  if (!base64) return res.status(400).json({ error: "No PDF data provided" });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: "application/pdf",
                  data: base64
                }
              },
              {
                text: `Parse this resume and return ONLY a JSON object with these exact keys:
{
  "name": "Full Name",
  "email": "email or null",
  "phone": "phone number or null",
  "currentRole": "most recent job title",
  "totalExp": "X years",
  "skills": ["up to 6 key skills"],
  "education": "Highest degree and institution",
  "summary": "2 sentence professional summary",
  "fitScore": <0-100 integer score vs role: ${jobTitle} requiring: ${(skills||[]).join(", ")}>,
  "fitReason": "1 sentence explaining the score",
  "strengths": ["2-3 key strengths relevant to ${jobTitle}"],
  "redFlags": ["any concerns or empty array"]
}
Return ONLY the JSON object. No markdown, no explanation, no backticks.`
              }
            ]
          }]
        })
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Gemini error:", err);
      return res.status(502).json({ error: "AI parsing failed", detail: err });
    }

    const data  = await response.json();
    const text  = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    res.json({ parsed });
  } catch (err) {
    console.error("Parse error:", err);
    res.status(500).json({ error: err.message || "Unknown error" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`CEI Recruiting API running on port ${PORT}`));
