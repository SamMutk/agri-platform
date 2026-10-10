import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type NoticeType = "success" | "error" | "info";

export default function TimedNotice({
  message,
  type,
  onDismiss,
  duration = 4500,
}: {
  message: string;
  type: NoticeType;
  onDismiss: () => void;
  duration?: number;
}) {
  const [isLeaving, setIsLeaving] = useState(false);
  const dismissRef = useRef(onDismiss);
  const isLeavingRef = useRef(false);

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  const beginDismiss = useCallback(() => {
    if (isLeavingRef.current) return;
    isLeavingRef.current = true;
    setIsLeaving(true);
    setTimeout(() => dismissRef.current(), 350);
  }, []);

  useEffect(() => {
    const leaveTimer = setTimeout(() => {
      beginDismiss();
    }, duration);

    return () => {
      clearTimeout(leaveTimer);
    };
  }, [beginDismiss, duration, message]);

  const Icon =
    type === "success" ? CheckCircle2 : type === "error" ? AlertCircle : Info;

  return (
    <div
      className={`timed-notice timed-notice-${type}${isLeaving ? " is-leaving" : ""}`}
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
    >
      <Icon className="timed-notice-icon" size={20} aria-hidden="true" />
      <span className="timed-notice-message">{message}</span>
      <button
        type="button"
        className="timed-notice-close"
        onClick={beginDismiss}
        aria-label="Dismiss notification"
      >
        <X size={18} aria-hidden="true" />
      </button>
      <span
        className="timed-notice-progress"
        style={{ animationDuration: `${duration}ms` }}
        aria-hidden="true"
      />
    </div>
  );
}
