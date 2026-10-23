---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. You see yourself on camera, and FocusRot can tell where your eyes point**
  Becomes usable: A page in Chrome that shows your camera. A small readout says whether your face is visible and shows your live eye angle. If the camera is blocked, you see the note to unblock the camera and show your face. If MediaPipe cannot load, the page says face tracking is unavailable.
  Why now: MediaPipe and the camera are the biggest unknowns. If eye angle cannot be read, nothing else matters. Project setup happens inside this step.
  PRD ref: `prd.md > The Core Journey` (step 5), `prd.md > States and Boundaries` (camera blocked or face not visible)
  Spec ref: `spec.md > Stack`, `spec.md > File Structure`, `spec.md > Components > Camera and Face Tracking`, `spec.md > Important Failure Modes`, `spec.md > Where It Runs and How Someone Tries It`
  Build: Set up Vite, React, and TypeScript in the project folder per the spec's file structure. Install MediaPipe. Write `src/tracking/faceTracking.ts` to start the webcam, load Face Landmarker, and report on each frame whether a face is visible and a horizontal and vertical eye angle. Show the camera full screen with a small debug readout. Show the unblock note when the camera is denied, and the unavailable note when MediaPipe fails to load.
  Verify (mechanical): `npm run build` finishes with no TypeScript errors. `npm run dev` starts and the page loads in a browser with no console errors. In a browser without camera access, the unblock note appears.
  Learner check: Run `npm run dev`, open the address in Chrome, and allow the camera. You should see yourself. Look at your laptop, then look away, then cover the camera or move out of frame. Say whether the readout changes when you do each one.
  Commit: `Show camera feed with live face and eye-angle tracking`

- [x] **2. You calibrate, and the border turns from green to red when you look away**
  Becomes usable: You press a calibrate button while looking at your laptop, phone, or notebook. A soft green haze sits around the screen. Look away and it slowly turns red. Look back in time and it slowly turns green. Leave the frame and it turns red faster.
  Why now: This is the unique kernel — the visible catch. It needs to be tried on your real camera early so we can tune how sensitive it is before adding more screens.
  PRD ref: `prd.md > Features and Behavior > Calibration`, `prd.md > On-work border`, `prd.md > Leaving the work`, `prd.md > Leaving the chair`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Components > Calibration`, `spec.md > Components > Focus State`, `spec.md > Look and Feel`
  Build: Add a calibration step that averages your eye angle for a moment and keeps it as the safe angle (in memory for now). Add the focus-state logic as plain functions: compare live angle to safe angle, move a 0-to-1 "redness" value up slowly when off-angle, faster when no face, and down slowly when back on. Draw the border haze with CSS from that value.
  Verify (mechanical): `npm run build` passes. A small Node check script feeds the focus-state logic fake frames and confirms: on-angle stays green, off-angle rises slowly, no-face rises faster, coming back lowers it, and it reaches full red only after sustained looking away.
  Learner check: Calibrate while looking at your laptop. Look away for a few seconds and watch the border go red. Look back before it is fully red and watch it go green. Then step out of frame and see it go red faster. Say whether the speed and sensitivity feel right.
  Commit: `Add calibration and green-to-red focus border`

- [x] **3. You can run a full session from the home page to the results**
  Becomes usable: A home page with a start button. Start leads to calibration, then "Session Start!" on a black fade, then the camera session with the app-icon bubble. The bubble lets you pause ("Session Pause" until you press play) and stop. Stop shows "Session End", fades through black, and shows session length, elapsed time, and the distraction count, with Finish back to home. Start waits with the unblock note if the camera is blocked or your face is not visible.
  Why now: Now that the catch works, this wraps it in the Strava-style start-and-stop flow so the core journey runs end to end.
  PRD ref: `prd.md > The Core Journey` (steps 1, 3-6, 9-12), `prd.md > Screens and Layout`, `prd.md > Session controls`, `prd.md > States and Boundaries` (paused, session ended, camera blocked)
  Spec ref: `spec.md > Components > Home Screen`, `spec.md > Components > Session Controls and Timer`, `spec.md > Look and Feel`, `spec.md > File Structure`
  Build: Add `Home.tsx`, `Calibration.tsx`, `Session.tsx`, `Pause.tsx`, and `Results.tsx`, with `App.tsx` switching between them. Add the timer: session length leaves out paused time, elapsed time includes it. Style the three big title screens alike with black fades.
  Verify (mechanical): `npm run build` passes. The Node check script confirms timer math: a session with a pause has a shorter session length than elapsed time by exactly the paused time. The home page loads in a browser with no console errors and start shows the camera note when no camera is available.
  Learner check: Start a session, pause for a bit, press play, then stop. Check that "Session Start!", "Session Pause", and "Session End" look the same, and that session length is shorter than elapsed time by about how long you paused.
  Commit: `Add home, session flow, pause, and results`

- [x] **4. Your chosen meme bonks you when the border finishes turning red**
  Becomes usable: Meme storage on the home page shows a few sample memes. You pick one before starting. During a session, when the border reaches full red, that meme pops up and the distraction count goes up by one. The results show the count, including zero.
  Why now: The bonk depends on the border and the session flow, which now both exist.
  PRD ref: `prd.md > Leaving the work`, `prd.md > The Core Journey` (steps 2, 7), `prd.md > Session history` (distraction count)
  Spec ref: `spec.md > Components > Meme Storage`, `spec.md > Components > Meme Bonk`, `spec.md > Data Model` (meme library)
  Build: Add a few original, rights-safe sample images in `public/sample-memes/`. Add `MemeStorage.tsx` to choose one. In the session, show the meme and add one distraction each time redness reaches full; don't count again until you have come back.
  Verify (mechanical): `npm run build` passes. The Node check script confirms one sustained look-away counts exactly one distraction, and coming back then looking away again counts a second.
  Learner check: Choose a meme, start a session, and look away until the border is fully red. The meme should pop up. Look back, stop the session, and check the distraction count.
  Commit: `Add meme storage and meme bonk with distraction count`

- [x] **5. Your sessions, meme choice, and safe angle are still there after you close Chrome**
  Becomes usable: Finish saves the session. The home page lists past sessions as lines of text; tapping one opens its stats. With none yet, it says "Nothing here yet" and hints to press start. The chosen meme and safe angle are remembered too.
  Why now: Storage is safest to add once the data it holds has settled through slices 2-4.
  PRD ref: `prd.md > Session history`, `prd.md > The Core Journey` (step 12), `prd.md > States and Boundaries` (no past session yet)
  Spec ref: `spec.md > Data Model`, `spec.md > Components > Session History`, `spec.md > File Structure` (`storage/focusDb.ts`)
  Build: Write `src/storage/focusDb.ts` with IndexedDB stores for profile, chosen meme, calibration, and past sessions. Save on Finish, meme choice, and calibration. Load on home. Add the past-session list and the empty state.
  Verify (mechanical): `npm run build` passes. In a browser, the home page shows "Nothing here yet" on a fresh profile; after writing a test session through the app's storage code and reloading, it appears as a line of text.
  Learner check: Do a short session and press Finish. Close Chrome, reopen the page, and check the session is listed. Tap it to see its stats.
  Commit: `Save sessions, meme choice, and calibration in IndexedDB`

- [x] **6. You can edit your profile and use settings from home or the bubble**
  Becomes usable: Profile lets you set a photo and a favourite meme (display only; it does not pick the bonk meme). Settings shows Recalibrate, which saves a new safe angle, and Camera, which shows whether Chrome allowed the camera and shows the unblock note if not. Settings opens from the home page and from the session bubble.
  Why now: These finish the home page. They are smaller and depend on storage and calibration, which now exist.
  PRD ref: `prd.md > Session controls` (settings), `prd.md > Product Decisions` (profile and settings)
  Spec ref: `spec.md > Components > Profile`, `spec.md > Components > Settings`, `spec.md > Data Model` (profile)
  Build: Add `Profile.tsx` and `Settings.tsx`. Save the photo and favourite meme to IndexedDB. Reuse calibration for Recalibrate. Use the browser's camera permission status for the Camera row.
  Verify (mechanical): `npm run build` passes. In a browser, setting a profile photo and reloading keeps it; Settings shows the camera status row; the bubble opens Settings during a session.
  Learner check: Set a profile photo and favourite meme, reload, and see they stay. Open Settings from home and from the bubble, recalibrate, and check the camera row.
  Commit: `Add profile and settings`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 2, try the border on your real camera and tune sensitivity
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: [what actually happened; real document/test/code references; unfinished work if interrupted]
Route and stops: [actual paths and symbols; guided stops completed, or reference-only route]
Edit outcome: [tried/kept/reverted/declined/not applicable; verification if changed]
Reflection: [offered/answered/declined/already covered — personal answer belongs only in the ignored profile]
Activity mode: [live app and editor, explicit static fallback, focused alternative, prior practice, or recap]

## Revisions

- Left/right gaze now comes from the iris position inside the eye plus a reduced head-turn weight, measured in the camera image; up/down uses nose-to-chin position plus eye blendshapes — at the slice 2 checkpoint, head tilt dominated and looking back at the screen with a turned head still counted as away, and head and eye up/down could cancel out.
- Face-missing gets a 1.5-second grace before "left the chair", and MediaPipe confidence was lowered to 0.3 — the learner saw "left the chair" while still seated, and when tilting toward the notebook or partly covering the face.
- Calibration starts with a 3-second countdown and reports when it couldn't see the face — pressing the on-screen button meant calibrating on the screen, not the notebook, and a failed calibration was silent.
- Added MediaPipe Pose Landmarker (lite), run only when no face is found: body still in view means the face is hidden and the border holds; body gone means left the chair — the learner saw a hand over the face counted as leaving the chair, and chose a second model for clarity after hearing the cost. Spec Stack, Camera and Face Tracking, Focus State, and Failure Modes, plus PRD Leaving the chair, were updated.
- Tracking runs on a ~30-per-second timer instead of animation frames — in slice 3 testing, Chrome slowed animation frames to about one per second when the window wasn't on screen, which starved calibration; a covered or hidden window during real study would do the same.
- Added `src/tracking/useTracking.ts` (camera and tracking hook shared by calibration and session), `src/sessionClock.ts` (session length and elapsed time), and `src/screens/TitleCard.tsx` (shared "Session Start!" / "Session End" title) alongside the spec's file structure — calibration and session both need the same camera, and the three title screens share one style.
- Calibration at start offers "Use saved angle" once one exists, and Settings > Recalibrate from home saves the angle that button reuses — without it, recalibrating from the home page saved an angle nothing ever used, because start always calibrates fresh.
- Opening Settings during a session freezes the border (the session clock keeps running); recalibrating mid-session resets the border to green and keeps the distraction count — the PRD didn't say how the border behaves while Settings is open.
- Red speeds slowed to 8 seconds (looking away) and 5 seconds total (left chair, including the grace) — learner asked for "a tad bit longer".
- Looking away now reaches a Bonk in about 6.4 seconds, 25% faster than 8. Leaving the chair without pausing reaches full red in about 3.3 seconds, 50% faster than 5, and the missed-face grace moved from 1.5 seconds to 1 second with that same speedup — the learner asked for both before the final review. The session clock is unchanged.
- Home launch totals, the day streak, custom meme images, a profile name, and Settings actions to forget the safe angle or clear sessions came in with the home-screen polish. `prd.md`, `spec.md`, and `scope.md > Later` now describe them. Streaks had been listed as later.

