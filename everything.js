// canvas-viewer.js
import express from "express";
import fetch from "node-fetch";

const app = express();

// ==== CONFIG ====
const CANVAS_BASE_URL = "https://learn.vccs.edu"; // replace
const CANVAS_TOKEN = "13096~nyAaGxQPf2DDQ3HVfkZ7m8L3PxzZJnLJwxAer9h4r8PVJ6cwhZaARxNWkkDn6eux"; // replace with your token
// Example endpoint: upcoming assignments
const CANVAS_ENDPOINT = "/api/v1/users/self/upcoming_events";

// ==== ROUTE ====
app.get("/", async (req, res) => {
  try {
    const response = await fetch(`${CANVAS_BASE_URL}${CANVAS_ENDPOINT}`, {
      headers: {
        Authorization: `Bearer ${CANVAS_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Canvas API error: ${response.status}`);
    }

    const data = await response.json();
    res.json(data); // browser auto-renders JSON as collapsible tree
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ==== START SERVER ====
app.listen(3000, () => {
  console.log("✅ Canvas JSON viewer running at http://localhost:3000");
});
