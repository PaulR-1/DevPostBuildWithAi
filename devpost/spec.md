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
5. Calibration asks you to look at your laptop, phone, or notebook. MediaPipe reads your eye angle. IndexedDB saves it as the safe angle.
6. The page shows "Session Start!" on a black fade, then your camera and the app-icon bubble. The border starts as a green haze.
7. On each camera frame, MediaPipe reports your eyes and whether your face is visible. The page moves the border from green toward red when your eyes leave the safe angle. Looking back moves it toward green. Your face leaving the camera moves it toward red faster.
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

Shows profile, settings, meme storage, past-session text, and start. Reads IndexedDB.

PRD ref: `prd.md > The Core Journey`.

### Profile

Edits the profile photo and the favourite meme display. Saves both in IndexedDB. The favourite meme does not choose the bonk meme.

PRD ref: `prd.md > The Core Journey`.

### Settings

Recalibrate saves a new safe eye angle. Camera shows whether Chrome has allowed the camera, and shows the unblock message when it has not.

PRD ref: `prd.md > Session controls`.

### Meme Storage

Shows the meme choices and saves the one chosen for the next session.

PRD ref: `prd.md > Leaving the work`.

### Camera and Face Tracking

Starts the webcam and asks MediaPipe for face and eye points on the laptop. When no face is found, it asks the pose model whether your shoulders are still in view.

PRD ref: `prd.md > Calibration`, `prd.md > Leaving the chair`.

### Calibration

Saves the eye angle while you look at your laptop, phone, or notebook.

PRD ref: `prd.md > Calibration`.

### Focus State

Compares the live eye angle with the safe angle. A visible face inside the safe angle is on the work. Eyes off that angle mean drifting or left the work. No visible face and no visible body means left the chair. A hidden face with your body still in view holds the border where it is.

PRD ref: `prd.md > On-work border`, `prd.md > Leaving the work`, `prd.md > Leaving the chair`.

### Session Controls and Timer

Runs start, pause, play, and stop. Session length excludes paused time. Elapsed time includes it.

PRD ref: `prd.md > Session controls`.

### Meme Bonk

Shows the chosen meme when the border finishes turning red, and adds one distraction.

PRD ref: `prd.md > Leaving the work`.

### Session History

Saves and lists session length, elapsed time, and distraction count. The empty home state says "Nothing here yet" and hints to press start.

PRD ref: `prd.md > Session history`.

## Data Model

All of this lives in IndexedDB in Chrome on this laptop.

- **Profile:** photo and favourite meme.
- **Meme library:** the images you can choose. The build starts with a few sample images in the project. Your chosen bonk meme is saved separately.
- **Calibration:** the safe eye angle.
- **Current session:** running, paused, or ended; start time; paused time; distraction count; chosen meme.
- **Past sessions:** session length, elapsed time, and distraction count. The home page shows each as a line of text.

Closing Chrome keeps this data. Clearing the site's browser data removes it.

## File Structure

```
project/
├── index.html
├── package.json
├── vite.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── screens/
│   │   ├── Home.tsx
│   │   ├── Profile.tsx
│   │   ├── Settings.tsx
│   │   ├── MemeStorage.tsx
│   │   ├── Calibration.tsx
│   │   ├── Session.tsx
│   │   ├── Pause.tsx
│   │   └── Results.tsx
│   ├── tracking/
│   │   └── faceTracking.ts
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
- **Face disappears during a session** → if your body is also gone for more than a short blip, treat it as leaving the chair and turn the border red faster. If your body is still there, the face is just hidden (for example a hand over it), and the border holds. Implements `prd.md > Leaving the chair`.
- **MediaPipe cannot load** → say face tracking is unavailable. Do not run a session that pretends to see you.

## What Was Simplified and Why

- **A Chrome page** instead of an installed app. You asked to open it in Chrome now and think about an app after the basics work.
- **MediaPipe on the laptop** instead of a paid camera service. The video stays on the computer.
- **IndexedDB for one person** instead of accounts and friend rooms. Friends are later in `scope.md > Later`.
- **A few sample meme images** instead of uploads, random choice, sound, and text-to-speech. Those extras are deferred in `prd.md > Deferred From the POC`. The demo video still needs permission for any copyrighted meme or music.

## Decisions and Open Issues

- **Chosen by you:** Chrome on the laptop now. A separate app can wait.
- **Chosen by you:** MediaPipe. The tradeoff is a larger first download.
- **Chosen by you:** React and TypeScript. The tradeoff is more setup and more errors to read.
- **Chosen by you:** IndexedDB. The tradeoff is more code than a small text note.
- **Derived from those choices:** Vite starts the page. A missing face during a session means you left the chair, because `prd.md > Leaving the chair` already defines that behavior.
- **Clarified earlier:** Devpost allows a laptop demo. It needs a public repository and a public video under three minutes. A live website is optional.
- **Check during the build:** use the laptop camera early and confirm that the saved eye angle can tell "on the work" from "looking away" well enough for the green and red border. If it is too jumpy, adjust the sensitivity before adding more screens.
- **Open questions from the PRD:** none.
