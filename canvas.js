// canvas-dashboard.js
import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json()); // to parse JSON POST bodies

// ==== CONFIG ====
const CANVAS_BASE_URL = "https://learn.vccs.edu"; // your Canvas instance
const ENDPOINT = "/api/v1/users/self/upcoming_events"; // returns upcoming assignments

// ======= HELPER: filter + group =======
function groupAssignmentsByCourse(assignments) {
  const upcoming = assignments.filter(a => {
    const due = new Date(a.assignment?.due_at || a.end_at);
    const now = new Date();
    const diff = (due - now) / (1000 * 60 * 60 * 24); // days
    return diff >= 0 && diff <= 14; // due in next 14 days
  });

  const grouped = {};
  for (const a of upcoming) {
    const course = a.context_name || "Unknown Course";
    if (!grouped[course]) grouped[course] = [];
    grouped[course].push(a);
  }
  return grouped;
}

// ======= FRONTEND (asks for API key) =======
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Canvas Dashboard</title>
      <style>
        body { font-family: Arial; background: #fafafa; padding: 20px; }
        .hidden { display: none; }
        input, button { padding: 8px; font-size: 14px; margin-right: 5px; }
        .course { margin-bottom: 20px; background: #fff; padding: 15px; border-radius: 8px; box-shadow: 0 0 5px rgba(0,0,0,0.1); }
        .course h2 { margin: 0 0 10px; cursor: pointer; color: #0066cc; }
        .assignments { display: none; margin-left: 15px; }
        .assignment { margin: 5px 0; }
        a { color: #0077cc; text-decoration: none; }
        a:hover { text-decoration: underline; }
        small { color: #666; }
      </style>
    </head>
    <body>
      <h1>Canvas Dashboard</h1>
      <div id="login">
        <p>Enter your Canvas API Token:</p>
        <input type="password" id="token" placeholder="Paste your token here" size="50" />
        <button id="fetchBtn">Fetch Upcoming Assignments</button>
      </div>
      <div id="results" class="hidden"></div>

      <script>
        document.getElementById("fetchBtn").addEventListener("click", async () => {
          const token = document.getElementById("token").value.trim();
          if (!token) return alert("Please enter your Canvas API token.");
          document.getElementById("fetchBtn").disabled = true;

          const res = await fetch("/fetch-assignments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token })
          });

          if (!res.ok) {
            const msg = await res.text();
            document.getElementById("results").innerHTML = "<pre style='color:red'>" + msg + "</pre>";
            document.getElementById("results").classList.remove("hidden");
            document.getElementById("fetchBtn").disabled = false;
            return;
          }

          const html = await res.text();
          document.getElementById("results").innerHTML = html;
          document.getElementById("results").classList.remove("hidden");
          document.getElementById("login").classList.add("hidden");

          // enable expand/collapse
          document.querySelectorAll('.course h2').forEach(h => {
            h.addEventListener('click', () => {
              const box = h.nextElementSibling;
              box.style.display = box.style.display === 'block' ? 'none' : 'block';
            });
          });
        });
      </script>
    </body>
    </html>
  `);
});

// ======= API ROUTE (fetch assignments using user token) =======
app.post("/fetch-assignments", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).send("Missing Canvas API token.");

  try {
    const response = await fetch(`${CANVAS_BASE_URL}${ENDPOINT}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Canvas API error ${response.status}: ${text}`);
    }

    const data = await response.json();
    const grouped = groupAssignmentsByCourse(data);

    // build HTML for assignments
    const html = `
      <h2>Upcoming Assignments (Next 14 Days)</h2>
      ${Object.entries(grouped)
        .map(([course, list]) => `
          <div class="course">
            <h2>${course}</h2>
            <div class="assignments">
              ${list
                .map(a => {
                  const due = new Date(a.assignment?.due_at || a.end_at);
                  return `
                    <div class="assignment">
                      <strong><a href="${a.html_url}" target="_blank">${a.title}</a></strong><br>
                      <small>Due: ${due.toLocaleString()}</small>
                    </div>
                  `;
                })
                .join("")}
            </div>
          </div>
        `)
        .join("")}
    `;
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

// ======= START SERVER =======
app.listen(3000, () =>
  console.log("✅ Canvas dashboard running → http://localhost:3000")
);
