import { Company } from "../models/company.model.js";
import { Project } from "../models/project.model.js";
import { ProjectMember } from "../models/projectMember.model.js";

export const OID_RE = /^[0-9a-fA-F]{24}$/;

const COMPANY_PREFIX = "company_";
const MGMT_SUFFIX = "_management";

// Room naming (shared by REST + sockets):
//   company room    -> "company_<companyId>"
//   management room -> "company_<companyId>_management"
//   project room    -> "<projectId>"
export const companyRoomId = (id) => `${COMPANY_PREFIX}${id}`;
export const managementRoomId = (id) => `${COMPANY_PREFIX}${id}${MGMT_SUFFIX}`;

export const parseRoomId = (roomId) => {
  if (typeof roomId !== "string") return { type: "invalid" };

  if (roomId.startsWith(COMPANY_PREFIX)) {
    let rest = roomId.slice(COMPANY_PREFIX.length);
    let type = "company";
    if (rest.endsWith(MGMT_SUFFIX)) {
      type = "management";
      rest = rest.slice(0, -MGMT_SUFFIX.length);
    }
    return OID_RE.test(rest) ? { type, companyId: rest } : { type: "invalid" };
  }

  return OID_RE.test(roomId) ? { type: "project", projectId: roomId } : { type: "invalid" };
};

const NONE = { canRead: false, canDelete: false };

/**
 * Who may read / delete in a room. `user` needs _id and companyId.
 * Returns { type, notFound?, canRead, canDelete }.
 */
export const getRoomAccess = async (user, roomId) => {
  const parsed = parseRoomId(roomId);
  if (parsed.type === "invalid") return { type: "invalid", ...NONE };

  if (parsed.type === "project") {
    const exists = await Project.exists({ _id: parsed.projectId });
    if (!exists) return { type: "project", notFound: true, ...NONE };

    const membership = await ProjectMember.findOne({
      projectId: parsed.projectId,
      userId: user._id,
    }).select("role");
    if (!membership) return { type: "project", ...NONE };

    return {
      type: "project",
      canRead: true,
      canDelete: ["manager", "admin"].includes(membership.role),
    };
  }

  // company + management rooms: caller must belong to THAT company
  if (!user.companyId || user.companyId.toString() !== parsed.companyId) {
    return { type: parsed.type, ...NONE };
  }

  const company = await Company.findById(parsed.companyId).select("createdBy");
  if (!company) return { type: parsed.type, notFound: true, ...NONE };

  const isOwner = company.createdBy?.toString() === user._id.toString();

  if (parsed.type === "company") {
    return { type: "company", canRead: true, canDelete: isOwner };
  }

  const isStaff =
    isOwner ||
    !!(await ProjectMember.exists({
      companyId: parsed.companyId,
      userId: user._id,
      role: { $in: ["admin", "manager"] },
    }));

  return { type: "management", canRead: isStaff, canDelete: isOwner };
};
