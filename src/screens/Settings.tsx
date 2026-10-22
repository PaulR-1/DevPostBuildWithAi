import { useEffect, useState, type TransitionEvent } from "react";
import { clearSessions } from "../storage/focusDb";
import { useDialog } from "./useDialog";
import type { PresencePhase } from "./usePresence";

type CameraPermission = "granted" | "denied" | "prompt" | "unknown";
type Confirm = "angle" | "sessions" | null;

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
  granted: "Allowed. Sessions can see your face.",
  denied: "Blocked. Unblock the camera in the browser, then come back.",
  prompt: "The browser will ask the next time a session needs the camera.",
  unknown: "The browser didn't say. It will ask when a session needs the camera.",
};

async function askCamera(): Promise<void> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((track) => track.stop());
  } catch {
    // The permission status updates on its own when the browser decides.
  }
}

export default function Settings({
  hasCalibration,
  onRecalibrate,
  onForgetCalibration,
  onSessionsCleared,
  onClose,
  phase,
  onTransitionEnd,
}: {
  hasCalibration: boolean;
  onRecalibrate: () => void;
  onForgetCalibration: () => void;
  onSessionsCleared: () => void;
  onClose: () => void;
  phase: PresencePhase;
  onTransitionEnd: (event: TransitionEvent<HTMLElement>) => void;
}) {
  const camera = useCameraPermission();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [clearing, setClearing] = useState(false);
  const dialogRef = useDialog(onClose);

  const forget = () => {
    onForgetCalibration();
    setConfirm(null);
  };

  const clearHistory = async () => {
    setClearing(true);
    try {
      await clearSessions();
      onSessionsCleared();
    } catch {
      // Leave the list as it is if storage refuses the delete.
    } finally {
      setClearing(false);
      setConfirm(null);
    }
  };

  return (
    <div className="settings-backdrop" data-phase={phase} onTransitionEnd={onTransitionEnd} onClick={onClose}>
      <div className="settings" data-phase={phase} ref={dialogRef} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <h2 id="settings-title">Settings</h2>

        <section className="settings-group">
          <h3>Focus</h3>
          <div className="settings-row">
            <div>
              <strong>Safe angle</strong>
              <p className="muted">
                {hasCalibration
                  ? "A safe angle is saved. Recalibrate if you moved your laptop, phone, or notebook."
                  : "Nothing saved yet. Calibrate when you start a session, or do it now."}
              </p>
            </div>
            <button className="pill-button pill-button--primary" onClick={onRecalibrate}>
              {hasCalibration ? "Recalibrate" : "Calibrate"}
            </button>
          </div>
          {hasCalibration && confirm !== "angle" && (
            <button className="text-button text-button--danger settings-link" onClick={() => setConfirm("angle")}>
              Forget saved angle
            </button>
          )}
          {confirm === "angle" && (
            <div className="settings-confirm">
              <span>Forget the saved angle?</span>
              <button className="text-button" onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button className="pill-button pill-button--danger" onClick={forget}>
                Forget
              </button>
            </div>
          )}
        </section>

        <section className="settings-group">
          <h3>Camera</h3>
          <div className="settings-row">
            <div>
              <strong>Camera</strong>
              <p className={camera === "denied" ? "settings-warning" : "muted"}>{CAMERA_TEXT[camera]}</p>
            </div>
            {camera !== "granted" && camera !== "denied" && (
              <button className="pill-button" onClick={askCamera}>
                Allow camera
              </button>
            )}
          </div>
        </section>

        <section className="settings-group">
          <h3>History</h3>
          {confirm !== "sessions" ? (
            <div className="settings-row">
              <div>
                <strong>Past sessions</strong>
                <p className="muted">Deletes every saved session from this browser.</p>
              </div>
              <button className="text-button text-button--danger" onClick={() => setConfirm("sessions")}>
                Clear
              </button>
            </div>
          ) : (
            <div className="settings-confirm">
              <span>Delete every past session?</span>
              <button className="text-button" onClick={() => setConfirm(null)} disabled={clearing}>
                Cancel
              </button>
              <button className="pill-button pill-button--danger" onClick={clearHistory} disabled={clearing}>
                {clearing ? "Deleting…" : "Delete"}
              </button>
            </div>
          )}
        </section>

        <button className="pill-button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
