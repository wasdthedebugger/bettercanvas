// canvas-cli.js
import fetch from "node-fetch";
import fs from "fs";
import readline from "readline";

// ===== CONFIG =====
const CANVAS_BASE_URL = "https://learn.vccs.edu";
const ENDPOINT = "/api/v1/users/self/upcoming_events";
const KEYS_FILE = "./keys.json";

// ===== HELPER: filter + group =====
function groupAssignmentsByCourse(assignments) {
  const upcoming = assignments.filter(a => {
    const due = new Date(a.assignment?.due_at || a.end_at);
    const now = new Date();
    const diff = (due - now) / (1000 * 60 * 60 * 24); // days difference
    return diff >= 0 && diff <= 14;
  });

  const grouped = {};
  for (const a of upcoming) {
    const course = a.context_name || "Unknown Course";
    if (!grouped[course]) grouped[course] = [];
    grouped[course].push(a);
  }
  return grouped;
}

// ===== HELPER: prompt =====
function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => {
    rl.close();
    resolve(ans.trim());
  }));
}

// ===== MAIN =====
async function main() {
  console.log("=== Canvas CLI Dashboard ===");

  // Load API keys
  let TOKENS;
  try {
    const data = fs.readFileSync(KEYS_FILE, "utf8");
    TOKENS = JSON.parse(data);
  } catch (err) {
    console.error(`❌ Error loading ${KEYS_FILE}: ${err.message}`);
    process.exit(1);
  }

  if (!Array.isArray(TOKENS) || TOKENS.length === 0) {
    console.error("❌ No API keys found in keys.json.");
    process.exit(1);
  }

  // Display users
  console.log("\nSelect a person:\n");
  TOKENS.forEach(([name], i) => console.log(`${i + 1}. ${name}`));

  const choice = await ask("\nEnter number: ");
  const index = parseInt(choice) - 1;

  if (isNaN(index) || index < 0 || index >= TOKENS.length) {
    console.error("❌ Invalid choice.");
    process.exit(1);
  }

  const [name, token] = TOKENS[index];
  console.log(`\nFetching assignments for ${name}...\n`);

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

    if (Object.keys(grouped).length === 0) {
      console.log("✅ No upcoming assignments in the next 14 days!");
      return;
    }

    console.log("📚 Upcoming Assignments (Next 14 Days):\n");

    for (const [course, list] of Object.entries(grouped)) {
      console.log(`\n=== ${course} ===`);
      for (const a of list) {
        const due = new Date(a.assignment?.due_at || a.end_at);
        console.log(`- ${a.title}`);
        console.log(`  Due: ${due.toLocaleString()}`);
        console.log(`  URL: ${a.html_url}\n`);
      }
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

main();