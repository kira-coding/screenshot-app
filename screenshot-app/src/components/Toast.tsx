import { useAppStore } from "../store/appStore";

export default function Toast() {
  const { toast } = useAppStore();
  if (!toast) return null;
  return (
    <div className="toast-container">
      <div className={`toast ${toast.type}`}>
        {toast.type === "success" && "✓"}{toast.type === "error" && "✕"}{toast.type === "info" && "ℹ"}
        {" "}{toast.msg}
      </div>
    </div>
  );
}
