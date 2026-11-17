import { memo, useRef, useState, useEffect } from "react";
import { Loader2, Paperclip, Send } from "lucide-react";
import { socket } from "@/lib/socket";
import { uploadChatFile } from "@/services/chat.service";

const MAX_CHARS = 2000;

function Composer({ activeRoomId, typingUsers = [] }) {
  const [text, setText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const isTypingRef = useRef(false);
  const typingTimerRef = useRef(null);

  // Clear typing state and timer when activeRoom changes or unmounts
  useEffect(() => {
    setText("");
    setUploadError("");
    if (isTypingRef.current && activeRoomId) {
      socket.emit("typing", { room: activeRoomId, isTyping: false });
    }
    isTypingRef.current = false;
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
  }, [activeRoomId]);

  const stopTyping = () => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      if (activeRoomId) {
        socket.emit("typing", { room: activeRoomId, isTyping: false });
      }
    }
  };

  const handleTextChange = (e) => {
    const value = e.target.value;
    if (value.length <= MAX_CHARS) {
      setText(value);
    }

    if (!activeRoomId) return;

    if (value.trim().length > 0) {
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        socket.emit("typing", { room: activeRoomId, isTyping: true });
      }
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      typingTimerRef.current = setTimeout(stopTyping, 1800);
    } else {
      stopTyping();
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > MAX_CHARS || !activeRoomId || isUploading) return;

    stopTyping();
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    socket.emit("sendMessage", {
      room: activeRoomId,
      message: trimmed,
    });

    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeRoomId) return;

    setIsUploading(true);
    setUploadError("");

    try {
      const res = await uploadChatFile(activeRoomId, file);
      const fileUrl = res?.data?.fileUrl;
      if (fileUrl) {
        // Emit shareFile with returned URL as specified in requirement
        socket.emit("shareFile", {
          room: activeRoomId,
          fileUrl,
        });
      }
    } catch (err) {
      setUploadError(err?.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Build typing status text
  const typingNames = (typingUsers || []).map((u) => u.userName).filter(Boolean);
  const typingText =
    typingNames.length === 1
      ? `${typingNames[0]} is typing...`
      : typingNames.length === 2
      ? `${typingNames[0]} and ${typingNames[1]} are typing...`
      : typingNames.length > 2
      ? "Several people are typing..."
      : "";

  return (
    <div className="border-t border-border bg-surface-base px-4 py-3">
      {/* Upload error display */}
      {uploadError && (
        <div className="mb-2 text-xs text-status-error flex items-center justify-between">
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError("")}
            className="font-medium underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Typing indicator */}
      <div className="h-4 mb-1">
        {typingText && (
          <div className="flex items-center gap-1.5 text-xs text-text-secondary italic">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-primary animate-pulse" />
            <span>{typingText}</span>
          </div>
        )}
      </div>

      <div className="flex items-end gap-2">
        {/* File Attach Button */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-background-subtle hover:text-brand-primary transition disabled:opacity-50"
          title="Attach a file"
          aria-label="Attach a file"
        >
          {isUploading ? (
            <Loader2 size={18} className="animate-spin text-brand-primary" />
          ) : (
            <Paperclip size={18} />
          )}
        </button>

        {/* Textarea + character counter */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            maxLength={MAX_CHARS}
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="textarea min-h-[44px] max-h-32 w-full resize-none py-2.5 pl-3 pr-16 text-sm"
          />
          <span
            className={`pointer-events-none absolute bottom-2.5 right-3 text-[11px] ${
              text.length >= MAX_CHARS - 100
                ? "font-semibold text-status-error"
                : "text-text-muted"
            }`}
          >
            {text.length}/{MAX_CHARS}
          </span>
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || text.length > MAX_CHARS || isUploading}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary text-text-inverse shadow-xs transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          title="Send message"
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

export default memo(Composer);
