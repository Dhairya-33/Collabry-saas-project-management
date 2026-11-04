// Run from backend/:  node scripts/maintenance.js [--delete-orphans] [--fix-duplicates]
import mongoose from "mongoose";
import connectDB from "../connect.js";
import { Task } from "../src/models/task.model.js";
import { Project } from "../src/models/project.model.js";
import { ProjectMember } from "../src/models/projectMember.model.js";
import { ProjectInvite } from "../src/models/projectInvite.model.js";
import { Chat } from "../src/models/chat.model.js";
import { User } from "../src/models/user.model.js";

const args = new Set(process.argv.slice(2));
const DELETE_ORPHANS = args.has("--delete-orphans");
const FIX_DUPLICATES = args.has("--fix-duplicates");
const ROLE_RANK = { admin: 0, manager: 1, employee: 2 };
const log = (...a) => console.log(...a);

await connectDB();

// 1. tasks without companyId -> copy from their project
log("\n[1] Tasks without companyId");
const projectIds = await Task.distinct("projectId", { companyId: null });
let backfilled = 0;
let orphans = 0;
for (const pid of projectIds) {
  const project = await Project.findById(pid).select("companyId");
  if (project) {
    const r = await Task.updateMany(
      { projectId: pid, companyId: null },
      { $set: { companyId: project.companyId } }
    );
    backfilled += r.modifiedCount;
  } else {
    orphans += await Task.countDocuments({ projectId: pid, companyId: null });
    if (DELETE_ORPHANS) await Task.deleteMany({ projectId: pid, companyId: null });
  }
}
log(`    backfilled: ${backfilled}`);
log(`    orphan tasks (project no longer exists): ${orphans}` +
  (orphans ? (DELETE_ORPHANS ? " -> deleted" : " -> rerun with --delete-orphans to remove") : ""));

// 2. duplicate project members (blocks the unique userId+projectId index)
log("\n[2] Duplicate project members");
const dupMembers = await ProjectMember.aggregate([
  {
    $group: {
      _id: { userId: "$userId", projectId: "$projectId" },
      rows: { $push: { id: "$_id", role: "$role", createdAt: "$createdAt" } },
      n: { $sum: 1 },
    },
  },
  { $match: { n: { $gt: 1 } } },
]);
log(`    duplicate groups: ${dupMembers.length}`);
if (dupMembers.length && FIX_DUPLICATES) {
  for (const g of dupMembers) {
    const rows = [...g.rows].sort(
      (a, b) =>
        (ROLE_RANK[a.role] ?? 9) - (ROLE_RANK[b.role] ?? 9) ||
        new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
    );
    await ProjectMember.deleteMany({ _id: { $in: rows.slice(1).map((r) => r.id) } });
  }
  log("    removed extra rows (kept highest role, then oldest)");
} else if (dupMembers.length) {
  log("    -> rerun with --fix-duplicates to clean");
}

// 3. duplicate pending invites (blocks the partial unique index)
log("\n[3] Duplicate pending invites");
const dupInvites = await ProjectInvite.aggregate([
  { $match: { status: "pending" } },
  {
    $group: {
      _id: { projectId: "$projectId", inviteeId: "$inviteeId" },
      rows: { $push: { id: "$_id", createdAt: "$createdAt" } },
      n: { $sum: 1 },
    },
  },
  { $match: { n: { $gt: 1 } } },
]);
log(`    duplicate groups: ${dupInvites.length}`);
if (dupInvites.length && FIX_DUPLICATES) {
  for (const g of dupInvites) {
    const rows = [...g.rows].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
    await ProjectInvite.deleteMany({ _id: { $in: rows.slice(1).map((r) => r.id) } });
  }
  log("    removed extra rows (kept newest)");
} else if (dupInvites.length) {
  log("    -> rerun with --fix-duplicates to clean");
}

// 4. duplicate project names per company (report only: rename by hand)
log("\n[4] Duplicate project names within a company");
const dupProjects = await Project.aggregate([
  {
    $group: {
      _id: { companyId: "$companyId", projectName: "$projectName" },
      ids: { $push: "$_id" },
      n: { $sum: 1 },
    },
  },
  { $match: { n: { $gt: 1 } } },
]);
log(`    duplicate groups: ${dupProjects.length}`);
for (const g of dupProjects) log(`    "${g._id.projectName}" -> ${g.ids.join(", ")}  (rename or delete one)`);

// 5. lowercase emails (login/register now lowercase them)
log("\n[5] Mixed-case emails");
const users = await User.find({}).select("_id email").lean();
const seen = new Map();
for (const u of users) {
  const k = String(u.email || "").trim().toLowerCase();
  seen.set(k, (seen.get(k) || 0) + 1);
}
let lowered = 0;
const conflicts = [];
for (const u of users) {
  if (!u.email) continue;
  const lower = u.email.trim().toLowerCase();
  if (u.email === lower) continue;
  if (seen.get(lower) > 1) {
    conflicts.push(u.email);
    continue;
  }
  await User.updateOne({ _id: u._id }, { $set: { email: lower } });
  lowered += 1;
}
log(`    lowercased: ${lowered}`);
if (conflicts.length) log(`    CONFLICTS (two accounts differ only by case, fix by hand): ${conflicts.join(", ")}`);

// 6. build indexes and show what exists
log("\n[6] Indexes");
const models = [
  ["Task", Task],
  ["Project", Project],
  ["ProjectMember", ProjectMember],
  ["ProjectInvite", ProjectInvite],
  ["Chat", Chat],
];
for (const [name, M] of models) {
  try {
    await M.createIndexes();
    log(`    ${name}: ok`);
  } catch (e) {
    log(`    ${name}: FAILED - ${e.message}`);
  }
  const idx = await M.collection.indexes();
  log(`        ${idx.map((i) => i.name).join(", ")}`);
}

await mongoose.disconnect();
log("\nDone.");
