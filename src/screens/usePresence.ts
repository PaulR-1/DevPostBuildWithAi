import { useEffect, useRef, useState, type TransitionEvent } from "react";

export type PresencePhase = "starting" | "open" | "ending";

type Presence = { mounted: boolean; phase: PresencePhase };

export function usePresence(open: boolean): {
  mounted: boolean;
  phase: PresencePhase;
  onTransitionEnd: (event: TransitionEvent<HTMLElement>) => void;
} {
  const [presence, setPresence] = useState<Presence>(
    open ? { mounted: true, phase: "starting" } : { mounted: false, phase: "ending" },
  );
  const openRef = useRef(open);
  openRef.current = open;
  const frame = useRef(0);

  if (open && !presence.mounted) {
    setPresence({ mounted: true, phase: "starting" });
  } else if (!open && presence.mounted && presence.phase === "open") {
    setPresence({ mounted: true, phase: "ending" });
  } else if (!open && presence.mounted && presence.phase === "starting") {
    setPresence({ mounted: false, phase: "ending" });
  }

  useEffect(() => {
    if (!presence.mounted || presence.phase !== "starting") return;
    const outer = requestAnimationFrame(() => {
      frame.current = requestAnimationFrame(() => {
        setPresence((current) =>
          current.phase === "starting" ? { mounted: true, phase: "open" } : current,
        );
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(frame.current);
    };
  }, [presence.mounted, presence.phase]);

  const onTransitionEnd = (event: TransitionEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.propertyName !== "opacity") return;
    if (openRef.current) return;
    setPresence({ mounted: false, phase: "ending" });
  };

  return {
    mounted: presence.mounted,
    phase: presence.phase,
    onTransitionEnd,
  };
}
