app.post("/api/parse-resume", async (req, res) => {
  const { base64, jobTitle, skills } = req.body;

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
              text: `Parse this resume and return ONLY a JSON object:
{"name":"string","email":"string|null","phone":"string|null",
"currentRole":"string","totalExp":"Xy",
"skills":["up to 6"],"education":"string",
"summary":"2 sentences",
"fitScore":<0-100 vs ${jobTitle} requiring ${(skills||[]).join(",")}>,
"fitReason":"1 sentence",
"strengths":["2-3 items"],
"redFlags":["array or empty"]}
ONLY JSON. No markdown.`
            }
          ]
        }]
      })
    }
  );

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  const clean = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);
  res.json({ parsed });
});
```

### Railway variable to add:
```
GEMINI_API_KEY = your-key-here
