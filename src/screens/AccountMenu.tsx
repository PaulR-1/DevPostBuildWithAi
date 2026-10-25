import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Meme } from "../memes";
import { getSetting } from "../storage/focusDb";
import Profile, { type ProfileData } from "./Profile";
import { usePresence } from "./usePresence";

function MenuIcon({ children }: { children: ReactNode }) {
  return (
    <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export default function AccountMenu({ memes, onOpenSettings }: { memes: Meme[]; onOpenSettings: () => void }) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const menuPresence = usePresence(open);
  const profilePresence = usePresence(profileOpen);
  const [profile, setProfile] = useState<ProfileData>({});
  const accountRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSetting<ProfileData>("profile").then((p) => p && setProfile(p));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    menuRef.current?.querySelector<HTMLElement>("[role='menuitem']")?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <>
      <div className="account" ref={accountRef}>
        <button
          className="account-button"
          data-sound={open ? "drop" : undefined}
          onClick={() => setOpen((value) => !value)}
          aria-label="Account menu"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          {profile.photo ? (
            <img src={profile.photo} alt="" />
          ) : (
            <MenuIcon>
              <circle cx="12" cy="8" r="3.25" />
              <path d="M5.5 19.25c1.15-2.9 3.35-4.35 6.5-4.35s5.35 1.45 6.5 4.35" />
            </MenuIcon>
          )}
        </button>
        {menuPresence.mounted && (
          <div
            className="account-menu"
            role="menu"
            ref={menuRef}
            data-phase={menuPresence.phase}
            onTransitionEnd={menuPresence.onTransitionEnd}
          >
              {profile.name?.trim() && <p className="account-name">{profile.name.trim()}</p>}
              <button
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  setProfileOpen(true);
                }}
              >
                <MenuIcon>
                  <circle cx="12" cy="8" r="3.25" />
                  <path d="M5.5 19.25c1.15-2.9 3.35-4.35 6.5-4.35s5.35 1.45 6.5 4.35" />
                </MenuIcon>
                Profile
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onOpenSettings();
                }}
              >
                <MenuIcon>
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                  <circle cx="9" cy="7" r="2.25" />
                  <circle cx="15" cy="17" r="2.25" />
                </MenuIcon>
                Settings
              </button>
          </div>
        )}
      </div>
      {profilePresence.mounted &&
        createPortal(
          <Profile
            memes={memes}
            onClose={() => setProfileOpen(false)}
            onChange={setProfile}
            phase={profilePresence.phase}
            onTransitionEnd={profilePresence.onTransitionEnd}
          />,
          document.body,
        )}
    </>
  );
}
