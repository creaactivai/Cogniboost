/**
 * apply-scenario.ts — seed/update one Scenario Sprint (text role-play) per
 * module, anchored to the REAL lessons' vocabulary / grammar / expressions
 * (Coral's rule). Reads one JSON file:
 *
 *   {
 *     "level": "B1",
 *     "scenarios": [
 *       {
 *         "moduleId": "uuid",
 *         "title": "Check into a hotel in London",
 *         "subtitle": "A short role-play to practise real travel English.",
 *         "studentRole": "You are a guest arriving at the Riverside Hotel…",
 *         "characterName": "Emma",
 *         "characterRole": "hotel receptionist",
 *         "accent": "british",                 // american | british | australian
 *         "goal": "Confirm your booking, ask about breakfast, get your key.",
 *         "openingLine": "Good afternoon, welcome to the Riverside Hotel!…",
 *         "targetVocab": ["check in","key card","reservation"],
 *         "targetLanguage": "polite requests (Could I…?), present simple",
 *         "minTurns": 4                        // optional, default 4
 *       }
 *     ]
 *   }
 *
 * SAFETY: dry-run by default. --commit writes (UPSERT by module_id). Rows are
 * written UNPUBLISHED unless you also pass --publish, so content can land
 * hidden, be reviewed, then flipped live.
 *
 * Usage:
 *   npx tsx scripts/apply-scenario.ts scripts/scenario-b1.json
 *   npx tsx scripts/apply-scenario.ts scripts/scenario-b1.json --commit
 *   npx tsx scripts/apply-scenario.ts scripts/scenario-b1.json --commit --publish
 */
import fs from "node:fs";
import { Client } from "pg";

const FILE = process.argv[2];
const COMMIT = process.argv.includes("--commit");
const PUBLISH = process.argv.includes("--publish");

const short = (s: any, n = 70) =>
  s == null ? "—" : String(s).replace(/\s+/g, " ").trim().slice(0, n) + (String(s).length > n ? "…" : "");

async function ensureTable(c: Client) {
  await c.query(`CREATE TABLE IF NOT EXISTS scenario_projects (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id varchar NOT NULL,
    level course_level NOT NULL,
    title text NOT NULL,
    subtitle text,
    student_role text NOT NULL,
    character_name text NOT NULL,
    character_role text NOT NULL,
    accent text NOT NULL DEFAULT 'british',
    goal text NOT NULL,
    opening_line text NOT NULL,
    target_vocab text[] NOT NULL DEFAULT '{}',
    target_language text,
    min_turns integer NOT NULL DEFAULT 4,
    is_published boolean NOT NULL DEFAULT false,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
  )`);
  await c.query(`CREATE UNIQUE INDEX IF NOT EXISTS scenario_projects_module_idx ON scenario_projects(module_id)`);
  // Submissions table (created here too so a fresh DB is fully ready).
  await c.query(`CREATE TABLE IF NOT EXISTS scenario_submissions (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id varchar NOT NULL,
    scenario_project_id varchar NOT NULL,
    module_id varchar NOT NULL,
    transcript jsonb NOT NULL DEFAULT '[]',
    ai_feedback jsonb,
    ai_score numeric(5,2),
    created_at timestamp DEFAULT now()
  )`);
}

async function main() {
  if (!FILE) throw new Error("Pass a JSON scenario file.");
  const data = JSON.parse(fs.readFileSync(FILE, "utf-8"));
  const level: string = data.level;
  if (!level) throw new Error("JSON must have a top-level \"level\".");

  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  if (COMMIT) await ensureTable(c);

  let changes = 0;
  console.log(`\n=== Scenario Sprints — ${level} ${COMMIT ? (PUBLISH ? "(COMMIT + PUBLISH)" : "(COMMIT, hidden)") : "(DRY-RUN)"} ===\n`);

  for (const item of data.scenarios ?? []) {
    if (!item.moduleId) throw new Error("Each scenario needs a moduleId.");
    for (const f of ["title", "studentRole", "characterName", "characterRole", "goal", "openingLine"]) {
      if (!item[f]) throw new Error(`Scenario for module ${item.moduleId} is missing "${f}".`);
    }

    const mod = await c.query(`SELECT id, title FROM course_modules WHERE id=$1`, [item.moduleId]);
    if (!mod.rows.length) throw new Error(`Module ${item.moduleId} not found`);

    const accent: string = item.accent || "british";
    const targetVocab: string[] = item.targetVocab?.length ? item.targetVocab : [];
    const targetLanguage: string | null = item.targetLanguage || null;
    const minTurns = item.minTurns ?? 4;
    const subtitle = item.subtitle || null;

    let existing: { rows: any[] } = { rows: [] };
    try {
      existing = await c.query(`SELECT id FROM scenario_projects WHERE module_id=$1`, [item.moduleId]);
    } catch (e: any) {
      if (e?.code !== "42P01") throw e; // 42P01 = undefined_table
    }
    const verb = existing.rows.length ? "UPDATE" : "INSERT";

    console.log(`${verb}  [${mod.rows[0].title}]`);
    console.log(`   title:      ${item.title}`);
    console.log(`   character:  ${item.characterName} (${item.characterRole}) · ${accent}`);
    console.log(`   goal:       ${short(item.goal, 70)}`);
    console.log(`   opening:    ${short(item.openingLine, 60)}`);
    console.log(`   vocab:      ${targetVocab.join(", ") || "—"}`);
    console.log(`   minTurns ${minTurns} · published ${PUBLISH}`);
    console.log("");
    changes++;

    if (COMMIT) {
      if (existing.rows.length) {
        await c.query(
          `UPDATE scenario_projects SET title=$1, subtitle=$2, student_role=$3, character_name=$4,
             character_role=$5, accent=$6, goal=$7, opening_line=$8, target_vocab=$9,
             target_language=$10, min_turns=$11, is_published=$12, updated_at=now()
           WHERE module_id=$13`,
          [item.title, subtitle, item.studentRole, item.characterName, item.characterRole, accent,
           item.goal, item.openingLine, targetVocab, targetLanguage, minTurns, PUBLISH, item.moduleId],
        );
      } else {
        await c.query(
          `INSERT INTO scenario_projects (module_id, level, title, subtitle, student_role, character_name,
             character_role, accent, goal, opening_line, target_vocab, target_language, min_turns, is_published)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [item.moduleId, level, item.title, subtitle, item.studentRole, item.characterName,
           item.characterRole, accent, item.goal, item.openingLine, targetVocab, targetLanguage, minTurns, PUBLISH],
        );
      }
    }
  }

  console.log(`${changes} scenario(s) ${COMMIT ? "written" : "to write"}.${COMMIT ? "" : "  Re-run with --commit to apply."}\n`);
  await c.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
