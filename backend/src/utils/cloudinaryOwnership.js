// Chat uploads are stored in a folder that is derived from the logged-in user on the SERVER,
// so a URL inside that folder proves who uploaded it. Users cannot pick their own folder.
export const chatUploadFolder = (user) =>
  `project_task/chat/${user?.companyId ?? "none"}/${user?._id}`;

/**
 * True only if `rawUrl` is an https Cloudinary URL of OUR cloud, pointing into the
 * calling user's own chat folder (no transformations, no path tricks).
 */
export const isOwnedChatUpload = (rawUrl, user) => {
  if (typeof rawUrl !== "string" || rawUrl.length > 2048 || !user?._id) return false;

  let u;
  try {
    u = new URL(rawUrl);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.hostname !== "res.cloudinary.com") return false;
  if (u.username || u.password || u.port) return false;

  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloud) return false;

  let pathname;
  try {
    pathname = decodeURIComponent(u.pathname);
  } catch {
    return false;
  }
  if (pathname.includes("..")) return false;

  const prefix = `/${cloud}/`;
  if (!pathname.startsWith(prefix)) return false;

  // <resource_type>/upload/[v123/]<folder>/<file>
  const m = /^(image|video|raw)\/upload\/(?:v\d+\/)?(.+)$/.exec(pathname.slice(prefix.length));
  if (!m) return false;

  return m[2].startsWith(`${chatUploadFolder(user)}/`);
};
