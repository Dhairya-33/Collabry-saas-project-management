import { ProjectMember } from "../models/projectMember.model.js";
import { ApiError } from "../utils/apiError.js";

/**
 * Check if the user has one of the allowed roles within a given project.
 * Must be used on routes that have :projectId in params or body.
 */
const authorizeProjectRoles = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const projectId =
        req.params.projectId || req.body.projectId || req.query.projectId;

      if (!user || !projectId) {
        throw new ApiError(400, "User or projectId missing in request");
      }

      const membership = await ProjectMember.findOne({
        userId: user._id,
        projectId,
      });

      if (!membership) {
        throw new ApiError(403, "You are not a member of this project");
      }

      if (!allowedRoles.includes(membership.role)) {
        throw new ApiError(
          403,
          `Access denied. Allowed roles: [${allowedRoles.join(", ")}]`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
export default authorizeProjectRoles;