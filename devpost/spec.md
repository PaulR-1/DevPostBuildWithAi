---
doc: spec
status: approved
---

# FocusRot — Technical Spec

## How This Works, In Plain Language

FocusRot is a React page that opens in Chrome on your laptop. The code is written in TypeScript. Vite starts the page.

Chrome uses the laptop camera. MediaPipe looks at that camera picture on the laptop and finds your face and eyes. FocusRot compares where your eyes are now with the safe angle it saved when you looked at your laptop, phone, or notebook. If your face leaves the camera, FocusRot treats that as leaving your chair.

Your profile photo, favourite meme, chosen bonk meme, safe angle, and past sessions are saved in IndexedDB. That drawer stays in Chrome on this laptop after you close the page. The camera video is not uploaded.

A separate installable app can wait until this Chrome version works.

## The Core Journey Through the System

PRD ref: `prd.md > The Core Journey`.

1. You run `npm install`, then `npm run dev`, and open the local address in Chrome.
2. The home screen reads IndexedDB. It shows your profile, settings, meme storage, past sessions, and start. If there is no past session, it shows "Nothing here yet" and a hint to press start.
3. You choose a meme in meme storage. That choice is saved in IndexedDB.
4. You press start. If the camera is blocked or your face cannot be seen, the page tells you to unblock the camera and show your face. "Session Start!" waits.
5. Calibration asks whether to save more than one angle. No is one look at the laptop, phone, or notebook. Yes lets you add spots until done, up to three. MediaPipe reads each eye angle. IndexedDB saves the list. An older single angle loads as a one-item list.
6. The page shows "Session Start!" on a black fade, then your camera and the app-icon bubble. The border starts as a green haze.
7. On each camera frame, MediaPipe reports your eyes and whether your face is visible. You are on the work inside the 15 degree by 12 degree box of any saved spot. The border and the face square use that spot's color, green then blue then violet, and mix it toward red when you leave every spot. Looking back moves it toward the spot color. Your face leaving the camera moves it toward red faster. The meme cannot appear again until 3 seconds after it pops.
8. When the border finishes turning red, the chosen meme appears and the distraction count increases by one.
9. Pause shows "Session Pause" and stops the session clock. Play resumes it. Paused time stays out of session length and stays inside elapsed time.
10. Stop shows "Session End", fades through black, and shows session length, elapsed time, and the distraction count. Finish writes that session to IndexedDB and returns to the home page.

## Stack

- **Chrome** — where FocusRot opens for this proof. You chose the laptop browser now, and a separate app later.
- **React** — draws the screens and updates the border, pause text, meme, and results. You chose it. The tradeoff is more setup and files. Documentation: https://react.dev/
- **TypeScript** — checks the code before it runs. You chose it with React. The tradeoff is more errors to read while learning. Documentation: https://www.typescriptlang.org/
- **Vite** — starts the React page in Chrome. This follows from React. Documentation: https://vite.dev/
- **MediaPipe Face Landmarker** — finds the face and eyes in the browser. You chose it. The tradeoff is a larger first download. Documentation: https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js
- **MediaPipe Pose Landmarker (lite)** — finds your shoulders when your face can't be seen, so a hand over your face is not mistaken for leaving the chair. You chose it at the slice 2 checkpoint for clarity. The tradeoff is a second download and a little more code. It only runs while the face is missing. Documentation: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js
- **IndexedDB** — stores photos, memes, calibration, and session history in Chrome on this laptop. You chose it. The tradeoff is more code than a small text note. Documentation: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

## Where It Runs and How Someone Tries It

- Runtime: Chrome on your laptop, with a camera.
- Internet is needed for `npm install` and the first MediaPipe download. Whether a later refresh works fully offline will be checked during the build.
- No API key is required.
- From the project folder, run `npm install`, then `npm run dev`. Open the local address Vite prints in Chrome.
- To record the Devpost demo, use the same local page and record the screen. The video must be under three minutes and public on YouTube or Vimeo.
- The submission also needs the public GitHub repository. Deployment is not required.

## Look and Feel

From `prd.md > Look and Feel` and `scope.md > Inspiration & Identity`:

- "Session Start!", "Session Pause", and "Session End" use the same large text.
- Start and end use a black faded background, then a fade.
- The session border is a soft green haze. It moves gradually to red, and back to green if you return in time.
- The chosen meme appears only after the border finishes turning red.
- The mood is playful and a little unhinged. React can do this with ordinary CSS. No extra design system is needed.

## Components

### Home Screen

Shows an account menu, a launch card, meme storage, and past-session text. The launch card shows the chosen meme, Start, and totals read from IndexedDB: Bonks, focus time, session count, and a day streak. The streak counts days in a row that have a saved session, and it still counts if the latest session was yesterday. The last eight sessions also draw as bars. Tapping a bar or a past-session line opens that session's stats.

PRD ref: `prd.md > The Core Journey`, `prd.md > Session history`.

### Profile

Opens from the account menu. Edits the name, profile photo, and favourite meme display. Saves them in IndexedDB. The favourite meme does not choose the bonk meme. The name is at most 24 characters.

PRD ref: `prd.md > The Core Journey`.

### Settings

Opens from the account menu and from the session bubble. The safe angle, including recalibrate and forget, is only in Settings opened from the session bubble. Forget during a running session sends you to calibrate again; the live angle stays until that finishes, so the border does not freeze. Camera shows whether Chrome has allowed the camera, can ask Chrome to allow it, and shows the unblock message when it has not. Sound saves a meme volume for the bonk and your meme sounds, and an ambient volume for clicks, the 3-2-1 countdown, and the sounds when a session starts and ends. History deletes every saved session after a confirm.

PRD ref: `prd.md > Session controls`.

### Meme Storage

Shows the sample memes and up to 20 images you add. Saves the one chosen for the next session. An added image is shrunk to fit inside a 480 pixel square and stored in IndexedDB. It only appears in the grid after that save works. If the browser's storage is full, a note says so and the image is not added. Removing one of your images also clears it if it was the profile favourite.

PRD ref: `prd.md > Leaving the work`.

### Camera and Face Tracking

Starts the webcam and asks MediaPipe for face and eye points on the laptop. When no face is found, it asks the pose model whether your shoulders are still in view.

PRD ref: `prd.md > Calibration`, `prd.md > Leaving the chair`.

### Calibration

Saves the eye angle while you look at your laptop, phone, or notebook.

PRD ref: `prd.md > Calibration`.

### Focus State

Compares the live eye angle with the safe angle. A visible face inside the safe angle is on the work. Eyes off that angle turn the border red in about 6.4 seconds, then count one Bonk. The meme stays hidden for 3 seconds after it appears, so a wobble cannot pop it again. No visible face and no visible body, for longer than 1 second, means left the chair: the border then reaches red in about 3.3 seconds total, without you pressing pause. A hidden face with your body still in view holds the border where it is. Looking back turns the border green again in about 2.4 seconds, the same 25% speedup as a look-away.

PRD ref: `prd.md > On-work border`, `prd.md > Leaving the work`, `prd.md > Leaving the chair`.

### Session Controls and Timer

Runs start, pause, play, and stop. Session length excludes paused time. Elapsed time includes it.

PRD ref: `prd.md > Session controls`.

### Meme Bonk

Shows the chosen meme when the border finishes turning red, and adds one Bonk. A new pop waits 3 seconds from the moment the meme appeared. The count is labeled Bonks on the results screen and on the home page. The count still waits until you are fully back on a safe color before it can go up again. Built-in memes play their own sound: Tralalero Tralala ends in bubbles instead of a bonk, Dust Baby flashes white with the flashbang, and Tung Tung Tung Sahur ends in a bonk. Added memes are a picture, a picture plus a sound, or a video of at most 15 seconds, and they end in the bonk. Looking back stops the sound.

PRD ref: `prd.md > Leaving the work`.

### Session History

Saves and lists session length, elapsed time, and the Bonk count. The empty home state says "Nothing here yet" and hints to press start. Settings can delete the whole list.

PRD ref: `prd.md > Session history`.

## Data Model

All of this lives in IndexedDB in Chrome on this laptop.

- **Profile:** name, photo, and favourite meme.
- **Meme library:** three built-in memes with pictures and sounds, plus up to 20 you add. An added meme can include a sound or a video of at most 15 seconds. Your chosen bonk meme is saved separately.
- **Calibration:** the safe eye angle. A list saved during the short multi-spot try is read as its first angle. Settings can delete it.
- **Current session:** running, paused, or ended; start time; paused time; Bonk count; chosen meme.
- **Past sessions:** session length, elapsed time, and Bonk count. The home page lists each line and sums them into Bonks, focus time, session count, and the day streak.

Closing Chrome keeps this data. Clearing the site's browser data removes it. Settings can delete past sessions without touching the profile, memes, or safe angle.

## File Structure

```
project/
├── index.html
├── package.json
├── vite.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── memes.ts
│   ├── sessionClock.ts
│   ├── screens/
│   │   ├── Home.tsx
│   │   ├── AccountMenu.tsx
│   │   ├── Profile.tsx
│   │   ├── Settings.tsx
│   │   ├── MemeStorage.tsx
│   │   ├── Calibration.tsx
│   │   ├── Session.tsx
│   │   ├── Pause.tsx
│   │   ├── Results.tsx
│   │   ├── TitleCard.tsx
│   │   ├── useDialog.ts
│   │   └── usePresence.ts
│   ├── tracking/
│   │   ├── faceTracking.ts
│   │   ├── focusState.ts
│   │   └── useTracking.ts
│   ├── storage/
│   │   └── focusDb.ts
│   └── styles.css
├── public/
│   └── sample-memes/
└── devpost/
```

## External Services and Dependencies

- **MediaPipe Face Landmarker for Web** — face and eye points in Chrome. No key, account, or fee. Documentation: https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js
- **React, TypeScript, and Vite** — local app tools. No account or fee. Documentation: https://react.dev/, https://www.typescriptlang.org/docs/, https://vite.dev/guide/
- **IndexedDB** — built into Chrome. No account or fee. Documentation: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- No hosted database, login service, or deployment service is planned.

## Important Failure Modes

- **Camera blocked or face missing before start** → show the note to unblock the camera and show your face. Wait to show "Session Start!" Implements `prd.md > States and Boundaries`.
- **Face disappears during a session** → if your body is also gone for more than 1 second, treat it as leaving the chair and turn the border fully red in about 3.3 seconds. If your shoulders stay and a wrist or index finger is inside the last face square, the face is covered and the border holds. If your shoulders stay and no hand is in that square, treat it as a look-away: full red in about 6.4 seconds. Implements `prd.md > Leaving the chair`.
- **MediaPipe cannot load** → say face tracking is unavailable. Do not run a session that pretends to see you.

## What Was Simplified and Why

- **A Chrome page** instead of an installed app. You asked to open it in Chrome now and think about an app after the basics work.
- **MediaPipe on the laptop** instead of a paid camera service. The video stays on the computer.
- **IndexedDB for one person** instead of accounts and friend rooms. Friends are later in `scope.md > Later`.
- **Your own meme images, up to 20, shrunk before they are saved** instead of random choice, sound, and text-to-speech. Those extras stay deferred in `prd.md > Deferred From the POC`. The demo video still needs permission for any copyrighted meme or music.

## Decisions and Open Issues

- **Chosen by you:** Chrome on the laptop now. A separate app can wait.
- **Chosen by you:** MediaPipe. The tradeoff is a larger first download.
- **Chosen by you:** React and TypeScript. The tradeoff is more setup and more errors to read.
- **Chosen by you:** IndexedDB. The tradeoff is more code than a small text note.
- **Derived from those choices:** Vite starts the page. A missing face during a session means you left the chair only when your body is gone too, because `prd.md > Leaving the chair` treats a hidden face with your body still in view as still seated.
- **Clarified earlier:** Devpost allows a laptop demo. It needs a public repository and a public video under three minutes. A live website is optional.
- **Check during the build:** use the laptop camera early and confirm that the saved eye angle can tell "on the work" from "looking away" well enough for the green and red border. If it is too jumpy, adjust the sensitivity before adding more screens.
- **Open questions from the PRD:** none.
