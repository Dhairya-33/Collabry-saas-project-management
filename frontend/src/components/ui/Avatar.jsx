const initialOf = (user) =>
  (user?.fullname || user?.username || "U").trim().charAt(0).toUpperCase();

const urlOf = (user) => {
  const pic = user?.profilePic;
  return typeof pic === "string" ? pic : pic?.url || null;
};

export default function Avatar({ user, className = "" }) {
  const url = urlOf(user);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${className}`}
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        initialOf(user)
      )}
    </span>
  );
}
