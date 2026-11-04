// Run from backend/:  node scripts/verify-schema.js [--no-db]
// Exit code: 0 = all checks pass, 1 = problems found.
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import mongoose from "mongoose";

const NO_DB = process.argv.includes("--no-db");
const ROOT = process.cwd();
const ENUM = ["admin", "manager", "employee"];
const log = console.log;
const problems = [];
const problem = (m) => {
  problems.push(m);
  log(`  PROBLEM: ${m}`);
};
const sample = (arr, n = 5) =>
  arr.slice(0, n).join(", ") + (arr.length > n ? ` ... (+${arr.length - n} more)` : "");

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" ? [] : walk(full);
    return e.name.endsWith(".js") ? [full] : [];
  });

// true only if every path segment matches on disk with EXACT letter case (what Linux does)
const existsExact = (abs) => {
  const parts = path.relative(ROOT, abs).split(path.sep);
  let cur = ROOT;
  for (const p of parts) {
    let names;
    try {
      names = fs.readdirSync(cur);
    } catch {
      return false;
    }
    if (!names.includes(p)) return false;
    cur = path.join(cur, p);
  }
  return true;
};

const srcFiles = [...walk("src"), "server.js"];

// ---------- A. imports match files on disk (case-sensitive) ----------
log("\n[A] Import paths match file names exactly (Linux-safe)");
const IMPORT_RE = /from\s+["'](\.[^"']+)["']/g;
for (const file of srcFiles) {
  const src = fs.readFileSync(file, "utf8");
  for (const m of src.matchAll(IMPORT_RE)) {
    const abs = path.resolve(path.dirname(file), m[1]);
    if (!existsExact(abs)) problem(`${file}: import "${m[1]}" matches no file on disk (wrong name or letter case)`);
  }
}

// ---------- B. git tracks the right file name ----------
log("\n[B] Git tracks projectMember.model.js with the right case");
try {
  const tracked = execSync("git ls-files src/models", { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
  const pm = tracked.filter((f) => /projectmember\.model\.js$/i.test(f));
  if (pm.length === 0) problem("git does not track any projectMember model file");
  else if (pm.length > 1 || !pm[0].endsWith("projectMember.model.js")) {
    problem(`git tracks: ${pm.join(", ")}  (fix: git mv <old> src/models/projectMember.model.js)`);
  }
} catch {
  log("  skipped (git not available)");
}

// ---------- C. role authorization patterns in the code ----------
log("\n[C] Role authorization patterns");
const BAD = [
  [/req\.user\.role\b/, "req.user.role does not exist (roles live in ProjectMember)"],
  [/\bauthorizeRoles\s*\(/, "authorizeRoles is not exported (the middleware is authorizeProjectRoles)"],
];
const ROLE_RE = /role\s*:\s*(?:"([^"]+)"|\{\s*\$in\s*:\s*\[([^\]]*)\])/g;
for (const file of srcFiles) {
  const src = fs.readFileSync(file, "utf8");
  src.split("\n").forEach((line, i) => {
    for (const [re, msg] of BAD) if (re.test(line)) problem(`${file}:${i + 1}: ${msg}`);
  });
  for (const m of src.matchAll(ROLE_RE)) {
    const vals = [m[1], ...((m[2] || "").match(/"([^"]+)"/g) || []).map((s) => s.slice(1, -1))].filter(Boolean);
    for (const v of vals) if (!ENUM.includes(v)) problem(`${file}: role "${v}" is not in the ProjectMember enum`);
  }
}

// ---------- D. ProjectMember schema ----------
log("\n[D] ProjectMember schema");
let ProjectMember;
try {
  ({ ProjectMember } = await import("../src/models/projectMember.model.js"));
  const s = ProjectMember.schema;
  const enumVals = s.path("role")?.enumValues ?? [];
  if (JSON.stringify([...enumVals].sort()) !== JSON.stringify([...ENUM].sort())) {
    problem(`role enum is [${enumVals.join(", ")}], expected [${ENUM.join(", ")}]`);
  }
  for (const f of ["userId", "projectId", "companyId"]) {
    if (!s.path(f)?.isRequired) problem(`${f} is not required`);
  }
  const uniq = s.indexes().some(([k, o]) => k.userId === 1 && k.projectId === 1 && o?.unique);
  if (!uniq) problem("unique {userId, projectId} index is not declared");
} catch (e) {
  problem(`cannot load ProjectMember model: ${e.message}`);
}

// ---------- E. data consistency ----------
if (NO_DB || !ProjectMember) {
  log("\n[E] Data checks skipped (--no-db)");
} else {
  log("\n[E] Data consistency");
  try {
    const { default: connectDB } = await import("../connect.js");
    await connectDB();
    const { Project } = await import("../src/models/project.model.js");
    const { Company } = await import("../src/models/company.model.js");
    const { User } = await import("../src/models/user.model.js");

    const members = await ProjectMember.find({}).select("userId projectId companyId role").lean();
    const projects = await Project.find({}).select("companyId managerId").lean();
    const companies = await Company.find({}).select("createdBy").lean();
    const users = await User.find({}).select("companyId").lean();

    const projectById = new Map(projects.map((p) => [String(p._id), p]));
    const companyById = new Map(companies.map((c) => [String(c._id), c]));
    const userById = new Map(users.map((u) => [String(u._id), u]));
    const byProject = new Map();
    const seen = new Set();
    const dup = [], badRole = [], orphan = [], wrongCompany = [], stale = [];

    for (const m of members) {
      const key = `${m.projectId}:${m.userId}`;
      if (seen.has(key)) dup.push(key);
      seen.add(key);
      if (!ENUM.includes(m.role)) badRole.push(String(m._id));
      const p = projectById.get(String(m.projectId));
      if (!p) {
        orphan.push(String(m._id));
        continue;
      }
      if (String(p.companyId) !== String(m.companyId)) wrongCompany.push(String(m._id));
      const u = userById.get(String(m.userId));
      if (!u || String(u.companyId ?? "") !== String(m.companyId)) stale.push(String(m._id));
      const k = String(p._id);
      if (!byProject.has(k)) byProject.set(k, []);
      byProject.get(k).push(m);
    }

    const noManager = [], multiManager = [], noOwner = [];
    for (const p of projects) {
      const rows = byProject.get(String(p._id)) ?? [];
      const mgr = rows.find((r) => String(r.userId) === String(p.managerId));
      if (!mgr || !["admin", "manager"].includes(mgr.role)) noManager.push(String(p._id));
      if (rows.filter((r) => r.role === "manager").length > 1) multiManager.push(String(p._id));
      const owner = companyById.get(String(p.companyId))?.createdBy;
      if (owner && !rows.some((r) => String(r.userId) === String(owner) && r.role === "admin")) {
        noOwner.push(String(p._id));
      }
    }

    const report = (list, msg) => list.length && problem(`${list.length} ${msg}: ${sample(list)}`);
    report(dup, "duplicate (project,user) membership rows");
    report(badRole, "membership rows with an invalid role");
    report(orphan, "membership rows whose project no longer exists");
    report(wrongCompany, "membership rows whose companyId differs from the project's");
    report(stale, "membership rows whose user left that company or no longer exists");
    report(noManager, "projects whose managerId has no admin/manager membership row");
    report(multiManager, "projects with more than one manager row");
    report(noOwner, "projects where the company owner has no admin row");

    const idx = await ProjectMember.collection.indexes();
    if (!idx.some((i) => i.unique && JSON.stringify(i.key) === JSON.stringify({ userId: 1, projectId: 1 }))) {
      problem("unique {userId, projectId} index is NOT built in the database (run scripts/maintenance.js)");
    }
    log(`  checked ${members.length} members, ${projects.length} projects`);
  } catch (e) {
    problem(`data checks failed: ${e.message}`);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

log("\n----------------------------------------");
if (problems.length) {
  console.error(`FAILED: ${problems.length} problem(s)`);
  process.exitCode = 1;
} else {
  log("OK: all checks passed");
}
