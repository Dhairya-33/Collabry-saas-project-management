import { memo } from "react";
import { Download, FileText, Trash2 } from "lucide-react";
import Avatar from "@/components/ui/Avatar";

const isImageUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  return (
    /\.(jpeg|jpg|png|gif|webp|svg)(\?.*)?$/i.test(url) ||
    url.includes("/image/upload/")
  );
};

const getFileName = (url) => {
  if (!url) return "Attachment";
  try {
    const parts = url.split("/");
    const last = parts[parts.length - 1];
    return decodeURIComponent(last.split("?")[0]) || "Attachment";
  } catch {
    return "Attachment";
  }
};

const formatTime = (isoString) => {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

function MessageItem({ message, isOwn, onDelete }) {
  const isImage = isImageUrl(message?.fileUrl);
  const fileName = message?.fileUrl ? getFileName(message.fileUrl) : null;
  const time = formatTime(message?.createdAt);

  return (
    <div
      className={`group flex items-end gap-2.5 px-4 py-1.5 transition ${
        isOwn ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* Avatar (for others) */}
      {!isOwn && (
        <Avatar
          user={{ fullname: message.senderName, username: message.senderName }}
          className="h-8 w-8 text-xs font-semibold bg-brand-secondary/15 text-brand-primary"
        />
      )}

      {/* Message Content */}
      <div
        className={`flex max-w-[80%] sm:max-w-[70%] flex-col ${
          isOwn ? "items-end" : "items-start"
        }`}
      >
        {/* Sender name for others */}
        {!isOwn && (
          <span className="mb-1 text-xs font-semibold text-text-secondary">
            {message.senderName || "Unknown"}
          </span>
        )}

        <div className="relative flex items-center gap-1.5">
          {/* Delete button for own message (positioned before bubble if own) */}
          {isOwn && (
            <button
              type="button"
              onClick={() => onDelete(message)}
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition p-1.5 rounded-full text-text-muted hover:text-status-error hover:bg-status-error/10"
              title="Delete message"
              aria-label="Delete message"
            >
              <Trash2 size={14} />
            </button>
          )}

          {/* Bubble */}
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-xs ${
              isOwn
                ? "bg-brand-primary text-text-inverse rounded-br-xs"
                : "bg-surface-base border border-border text-text-primary rounded-bl-xs"
            }`}
          >
            {/* Text message */}
            {message.message && (
              <p className="whitespace-pre-wrap break-words">{message.message}</p>
            )}

            {/* File attachment */}
            {message.fileUrl && (
              <div className={message.message ? "mt-2" : ""}>
                {isImage ? (
                  <div className="overflow-hidden rounded-xl">
                    <a
                      href={message.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group/img cursor-pointer"
                    >
                      <img
                        src={message.fileUrl}
                        alt="Attachment"
                        className="max-h-60 max-w-xs rounded-xl object-cover hover:opacity-95 transition"
                        loading="lazy"
                      />
                    </a>
                  </div>
                ) : (
                  <a
                    href={message.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs font-medium transition ${
                      isOwn
                        ? "border-text-inverse/20 bg-text-inverse/10 text-text-inverse hover:bg-text-inverse/20"
                        : "border-border bg-background-subtle text-text-primary hover:bg-background-app"
                    }`}
                  >
                    <FileText size={16} className="shrink-0" />
                    <span className="truncate max-w-[160px] sm:max-w-[220px]">
                      {fileName}
                    </span>
                    <Download size={14} className="shrink-0 opacity-70 ml-auto" />
                  </a>
                )}
              </div>
            )}

            {/* Timestamp inside bubble */}
            <div
              className={`mt-1 flex items-center justify-end text-[10px] select-none ${
                isOwn ? "text-text-inverse/70" : "text-text-secondary"
              }`}
            >
              <span>{time}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(MessageItem);
