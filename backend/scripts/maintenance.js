// Run from backend/:
//   node scripts/maintenance.js --dry-run                      report only, writes NOTHING
//   node scripts/maintenance.js [--delete-orphans] [--fix-duplicates]
//
// Exit codes:  0 = finished, nothing left to fix
//              1 = a step threw, an index failed, or blocking problems remain
//              2 = bad command line option
import mongoose from "mongoose";
import connectDB from "../connect.js";
import { Task } from "../src/models/task.model.js";
import { Project } from "../src/models/project.model.js";
import { ProjectMember } from "../src/models/projectMember.model.js";
import { ProjectInvite } from "../src/models/projectInvite.model.js";
import { Chat } from "../src/models/chat.model.js";
import { User } from "../src/models/user.model.js";

const KNOWN = new Set(["--dry-run", "--delete-orphans", "--fix-duplicates"]);
const args = new Set(process.argv.slice(2));
for (const a of args) {
  if (!KNOWN.has(a)) {
    console.error(`Unknown option: ${a}\nAllowed: ${[...KNOWN].join(" ")}`);
    process.exit(2);
  }
}
const DRY = args.has("--dry-run");
const DELETE_ORPHANS = args.has("--delete-orphans");
const FIX_DUPLICATES = args.has("--fix-duplicates");
const ROLE_RANK = { admin: 0, manager: 1, employee: 2 };

const log = (...a) => console.log(...a);
const problems = [];
const problem = (msg) => {
  problems.push(msg);
  log(`    PROBLEM: ${msg}`);
};
const step = async (name, fn) => {
  log(`\n[${name}]`);
  try {
    await fn();
  } catch (e) {
    problem(`step "${name}" threw: ${e.message}`);
  }
};

const main = async () => {
  await connectDB();
  log(DRY ? "DRY RUN: nothing will be written" : "LIVE RUN: changes will be written");

  // 1. tasks without companyId -> copy from their project
  await step("1. Tasks without companyId", async () => {
    const projectIds = await Task.distinct("projectId", { companyId: null });
    let fixable = 0;
    let backfilled = 0;
    let orphans = 0;
    let orphansDeleted = 0;
    for (const pid of projectIds) {
      const n = await Task.countDocuments({ projectId: pid, companyId: null });
      const project = await Project.findById(pid).select("companyId");
      if (project) {
        fixable += n;
        if (!DRY) {
          const r = await Task.updateMany(
            { projectId: pid, companyId: null },
            { $set: { companyId: project.companyId } }
          );
          backfilled += r.modifiedCount;
        }
      } else {
        orphans += n;
        if (DELETE_ORPHANS && !DRY) {
          const r = await Task.deleteMany({ projectId: pid, companyId: null });
          orphansDeleted += r.deletedCount;
        }
      }
    }
    log(DRY ? `    would backfill: ${fixable}` : `    backfilled: ${backfilled}`);
    log(`    orphan tasks (project no longer exists): ${orphans}`);
    if (orphans) {
      if (DELETE_ORPHANS) log(DRY ? `    would delete: ${orphans}` : `    deleted: ${orphansDeleted}`);
      else log("    -> add --delete-orphans to remove them");
    }
  });

  // 2. duplicate project members (blocks the unique userId+projectId index)
  await step("2. Duplicate project members", async () => {
    const groups = await ProjectMember.aggregate([
      {
        $group: {
          _id: { userId: "$userId", projectId: "$projectId" },
          rows: { $push: { id: "$_id", role: "$role", createdAt: "$createdAt" } },
          n: { $sum: 1 },
        },
      },
      { $match: { n: { $gt: 1 } } },
    ]);
    const extra = groups.reduce((s, g) => s + g.n - 1, 0);
    log(`    duplicate groups: ${groups.length} (${extra} extra rows)`);
    if (!groups.length) return;

    if (!FIX_DUPLICATES) {
      problem(`${groups.length} duplicate membership group(s): rerun with --fix-duplicates`);
      return;
    }
    if (DRY) {
      log(`    would remove ${extra} extra rows (keep highest role, then oldest)`);
      return;
    }
    for (const g of groups) {
      const rows = [...g.rows].sort(
        (a, b) =>
          (ROLE_RANK[a.role] ?? 9) - (ROLE_RANK[b.role] ?? 9) ||
          new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
      );
      await ProjectMember.deleteMany({ _id: { $in: rows.slice(1).map((r) => r.id) } });
    }
    log(`    removed ${extra} extra rows (kept highest role, then oldest)`);
  });

  // 3. duplicate pending invites (blocks the partial unique index)
  await step("3. Duplicate pending invites", async () => {
    const groups = await ProjectInvite.aggregate([
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
    const extra = groups.reduce((s, g) => s + g.n - 1, 0);
    log(`    duplicate groups: ${groups.length} (${extra} extra rows)`);
    if (!groups.length) return;

    if (!FIX_DUPLICATES) {
      problem(`${groups.length} duplicate pending-invite group(s): rerun with --fix-duplicates`);
      return;
    }
    if (DRY) {
      log(`    would remove ${extra} extra rows (keep newest)`);
      return;
    }
    for (const g of groups) {
      const rows = [...g.rows].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
      await ProjectInvite.deleteMany({ _id: { $in: rows.slice(1).map((r) => r.id) } });
    }
    log(`    removed ${extra} extra rows (kept newest)`);
  });

  // 4. duplicate project names per company (never auto-fixed: rename by hand)
  await step("4. Duplicate project names within a company", async () => {
    const groups = await Project.aggregate([
      {
        $group: {
          _id: { companyId: "$companyId", projectName: "$projectName" },
          ids: { $push: "$_id" },
          n: { $sum: 1 },
        },
      },
      { $match: { n: { $gt: 1 } } },
    ]);
    log(`    duplicate groups: ${groups.length}`);
    for (const g of groups) {
      problem(`project name "${g._id.projectName}" used by ${g.ids.join(", ")} (rename or delete one)`);
    }
  });

  // 5. lowercase emails (login/register lowercase them)
  await step("5. Mixed-case emails", async () => {
    const users = await User.find({}).select("_id email").lean();
    const counts = new Map();
    for (const u of users) {
      const k = String(u.email || "").trim().toLowerCase();
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    let lowered = 0;
    for (const u of users) {
      if (!u.email) continue;
      const lower = u.email.trim().toLowerCase();
      if (u.email === lower) continue;
      if (counts.get(lower) > 1) {
        problem(`accounts differ only by email case, fix by hand: ${u.email}`);
        continue;
      }
      lowered += 1;
      if (!DRY) await User.updateOne({ _id: u._id }, { $set: { email: lower } });
    }
    log(DRY ? `    would lowercase: ${lowered}` : `    lowercased: ${lowered}`);
  });

  // 6. indexes
  await step("6. Indexes", async () => {
    const models = [
      ["Task", Task],
      ["Project", Project],
      ["ProjectMember", ProjectMember],
      ["ProjectInvite", ProjectInvite],
      ["Chat", Chat],
    ];
    for (const [name, M] of models) {
      if (!DRY) {
        try {
          await M.createIndexes();
        } catch (e) {
          problem(`${name}: index build FAILED - ${e.message}`);
        }
      }
      const idx = await M.collection.indexes();
      log(`    ${name}: ${idx.map((i) => i.name).join(", ")}`);
    }

    const expected = [
      ["ProjectMember", ProjectMember, { userId: 1, projectId: 1 }],
      ["Project", Project, { companyId: 1, projectName: 1 }],
      ["ProjectInvite", ProjectInvite, { projectId: 1, inviteeId: 1 }],
    ];
    for (const [name, M, key] of expected) {
      const idx = await M.collection.indexes();
      const ok = idx.some((i) => i.unique === true && JSON.stringify(i.key) === JSON.stringify(key));
      if (ok) log(`    ${name}: unique index ${JSON.stringify(key)} present`);
      else if (DRY) log(`    ${name}: unique index ${JSON.stringify(key)} MISSING (a live run will try to build it)`);
      else problem(`${name}: unique index ${JSON.stringify(key)} is missing`);
    }
  });
};

try {
  await main();
} catch (e) {
  problems.push(`unexpected error: ${e.message}`);
  console.error(e);
} finally {
  await mongoose.disconnect().catch(() => {});
}

log("\n----------------------------------------");
if (DRY) log("DRY RUN: no changes were written.");
if (problems.length) {
  console.error(`FAILED: ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exitCode = 1;
} else {
  log("OK: no blocking problems.");
}
