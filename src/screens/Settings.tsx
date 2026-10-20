import { useEffect, useState } from "react";

type CameraPermission = "granted" | "denied" | "prompt" | "unknown";

function useCameraPermission(): CameraPermission {
  const [state, setState] = useState<CameraPermission>("unknown");
  useEffect(() => {
    let status: PermissionStatus | null = null;
    const update = () => status && setState(status.state);
    navigator.permissions
      ?.query({ name: "camera" as PermissionName })
      .then((s) => {
        status = s;
        update();
        s.addEventListener("change", update);
      })
      .catch(() => setState("unknown"));
    return () => status?.removeEventListener("change", update);
  }, []);
  return state;
}

const CAMERA_TEXT: Record<CameraPermission, string> = {
  granted: "Allowed",
  denied: "Blocked. Unblock the camera and show your face.",
  prompt: "Chrome will ask when you start a session.",
  unknown: "Chrome didn't say. It will ask when you start a session.",
};

export default function Settings({ onRecalibrate, onClose }: { onRecalibrate: () => void; onClose: () => void }) {
  const camera = useCameraPermission();

  return (
    <div className="settings-backdrop" onClick={onClose}>
      <div className="settings" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Settings">
        <h2>Settings</h2>

        <div className="settings-row">
          <div>
            <strong>Recalibrate</strong>
            <p className="muted">Look at your laptop, phone, or notebook to save a new safe angle.</p>
          </div>
          <button className="pill-button pill-button--primary" onClick={onRecalibrate}>
            Recalibrate
          </button>
        </div>

        <div className="settings-row">
          <div>
            <strong>Camera</strong>
            <p className={camera === "denied" ? "settings-warning" : "muted"}>{CAMERA_TEXT[camera]}</p>
          </div>
        </div>

        <button className="pill-button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
