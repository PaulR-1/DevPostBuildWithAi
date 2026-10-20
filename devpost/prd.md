---
doc: prd
status: approved
---

# FocusRot — Product Requirements

A review session for you. The camera watches the angle of your eyes and whether you have left your chair, and a border on the screen shows if you are on the work.

Source: `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`, `scope.md > The POC Boundary`.

## The Core Journey

1. You open FocusRot on the opening page. That page has your profile, settings, past Focus sessions, meme and brainrot storage, and the start icon.
2. Before the session starts, you choose the meme that will bonk you. There are many memes. Your profile favourite meme is separate. It shows other people which meme you like. It does not pick today's meme.
3. You press start. FocusRot asks you to look at your laptop, phone, or notebook. It saves that eye angle as the safe angle.
4. The screen shows "Session Start!" on a black faded background. The words fade out.
5. You see yourself on the camera. A small bubble, the app icon, sits on the screen. A faded green border, like a slight haze, sits around the edges. That green border means you are on the work.
6. If your eyes leave the safe angle, the green border slowly turns red. If you look back at your laptop, phone, or notebook before it becomes fully red, the border slowly becomes green again.
7. If you keep looking away, the border finishes turning red. The meme you chose pops up and bonks you. That moment counts as one distraction.
8. If you leave your chair, the border turns red faster than it does when your eyes look away.
9. You can click the app icon to stop the session, pause the session, or open settings.
10. When you stop, the session ends. The screen shows "Session End," like "Session Start!" Then the screen fades through black.
11. You see the session analytics: session length, elapsed time, and how many times you got distracted. Session length leaves out paused time. Elapsed time includes paused time. A button says Finish.
12. You press Finish. You return to the home page. The finished session is a line of text there. You can tap it to open those same stats.

## Screens and Layout

- **Opening page.** Profile, settings, past Focus sessions, meme and brainrot storage, and the start icon. These stay off the session screen.
- **Calibration.** You see the ask to look at your laptop, phone, or notebook. This happens before "Session Start!"
- **Session.** Your camera fills the screen. The only extra control is the small app-icon bubble. The border around the edges of the screen is the sign of whether you are on the work.
- **Session end.** "Session End" shows in the same style as "Session Start!" The screen then fades through black.
- **Session analytics.** You see session length, elapsed time, and the distraction count. A Finish button takes you back to the home page.
- **Past session.** On the home page, each past session is a line of text you tap to open those same stats. Cards wait for later. The first time, when there is no past session, that spot shows "Nothing here yet" and a hint to press start.

## Look and Feel

- Session start uses the words "Session Start!" on a black faded background, then the words fade out.
- Pause uses the words "Session Pause" in that same font, and the screen stays until you unpause.
- Session end uses the words "Session End" in that same style, then a black fade.
- On the work, the screen has a faded green border, like a slight haze.
- Leaving the work turns that border from green toward red, slowly.
- Coming back before the border is fully red turns it slowly back to green.
- The chosen meme bonks you after the border finishes turning red. The profile favourite meme is a display for other people later.

## Features and Behavior

### Calibration

FocusRot asks you to look at your laptop, phone, or notebook. It saves the angle of your eyes. That saved angle is the safe angle. An angle off that spot is not safe.

### On-work border

While your eyes stay on the safe angle and you are in your chair, the border stays a faded green haze.

### Leaving the work

Your eyes leave the safe angle. The border slowly turns from green to red. It does not disappear at once, and it does not snap to red.

You look back before the border is fully red. The border slowly becomes green again.

You do not look back. The border finishes turning red. The meme you chose before the session pops up and bonks you. That counts as one distraction. The meme does not appear the instant you look away. `scope.md > Explicitly Cut` gives you a chance to come back first.

### Leaving the chair

You leave your chair. The border turns red faster than it does for a look away.

You cover your face, for example with your hand, but you are still in your chair. That is not leaving the chair. The border stays where it is until FocusRot can see your eyes again. You chose this at the first build checkpoint, for clarity.

Noted before removal, as you asked: slumping is out. No slouch detection, no "bad sitting" check, and no other function about how you sit while still in the chair. `scope.md > The Unique Kernel` watches posture. For this proof, posture means whether you have left the chair.

### Session controls

The bubble is the app icon. Clicking it can stop the session, pause the session, or open settings.

Settings shows two things, from the opening page and from the session bubble. Recalibrate asks you to look at your laptop, phone, or notebook again, and FocusRot saves a new safe eye angle. Camera shows whether the camera is allowed. If it is blocked, you get the same note to unblock the camera and show your face.

Pause shows the words "Session Pause" in the same font as "Session Start!" That screen stays until you unpause. The pause button’s place shows a play button. You press play to unpause.

Stop ends the session. The screen shows "Session End," like the start, then fades through black. The next screen shows the session analytics: session length, elapsed time, and distraction count. You press Finish and return to the home page.

### Session history

A finished session keeps three stats. Session length is how long it ran, and paused time is not included. Elapsed time is all of the time combined, including paused time. The distraction count includes zero. More stats can wait.

You count one distraction when the meme comes out. The meme comes out when the border finishes turning red and you have not come back. You already said this.

## States and Boundaries

- **On the work** — faded green haze around the screen.
- **Drifting** — the border is between green and red. You can still come back, and the border slowly returns to green.
- **Left the work** — the border has finished turning red. The chosen meme bonks you. This counts as one distraction.
- **Left the chair** — the border turns red faster.
- **Came back in time** — the border slowly becomes green again.
- **No past session yet** — the past-session spot shows "Nothing here yet" and a hint to press start.
- **Camera blocked or face not visible** — you press start, and a notification tells you to unblock the camera and show your face. FocusRot waits until it can see your face before it shows "Session Start!"
- **Paused** — the screen shows "Session Pause" in the same font as "Session Start!" and stays there until you unpause. A play button sits where the pause button was.
- **Session ended** — the screen shows "Session End," then fades through black, then shows the session analytics and a Finish button. Finish returns to the home page.

## Product Decisions

- The safe angle is the eye angle saved while you look at your laptop, phone, or notebook. Off that angle is not safe. This follows `scope.md > The Core Loop`.
- The border shows whether you are on the work. Source: `scope.md > What "Working" Looks Like`. The chosen meme bonks you only after the border finishes turning red.
- Green turns to red slowly. Looking back in time turns it slowly green again. You corrected an instant on/off change.
- Leaving the chair speeds the turn to red. You chose this instead of a general posture check.
- Slumping is removed. You said it is a little out of scope, and to take out functions related to it. This note was saved before treating slumping as gone.
- Session length, elapsed time, and distraction count are in this proof. Session length leaves out paused time. Elapsed time includes paused time. You added elapsed time so pause time is still visible. Extra stats wait.
- Each past session is a line of text you tap to open its stats. You chose text for now. Cards wait.
- With no past session yet, the spot shows "Nothing here yet" and a hint to press start. You chose both.
- If the camera is off or your face cannot be seen when you press start, a notification tells you to unblock the camera and show your face. FocusRot waits until it can see your face before "Session Start!" You confirmed that wait.
- Pause shows "Session Pause" in the same font as "Session Start!" and stays on that screen until you unpause. You press the play button in the pause button’s place to unpause.
- Settings shows recalibrate and camera. Recalibrate saves a new safe eye angle from your laptop, phone, or notebook. Camera shows whether the camera is allowed. If it is blocked, it tells you to unblock the camera and show your face. You added both.
- Profile shows a profile photo and a favourite meme. The favourite meme is a display. Later, other people can see which meme you like best. It does not pick the meme for today's session.
- There are many memes that can bonk you. Before a session starts, you choose which one will bonk you. You already described this, and it matches the meme vault in the original FocusRot writeup.
- The chosen meme bonks you when the border finishes turning red. It does not bonk the instant you look away. You already answered this. One distraction is counted then.
- Stop shows "Session End," then a black fade, then the session analytics and a Finish button. Finish returns to the home page. The analytics are the three stats you already chose: session length, elapsed time, and distraction count.

## What We're Building

- The opening page and the start icon.
- A camera view of you.
- Calibration that saves the safe eye angle from your laptop, phone, or notebook.
- A session that starts with "Session Start!" and then shows you on camera.
- Gaze checked against the saved angle.
- A check for whether you have left the chair.
- A green-to-red border, a slow return to green if you come back in time, and a faster turn to red if you leave the chair.
- A way to stop the session, pause it, and resume it with the play button.
- "Session End," a black fade, the session analytics, and a Finish button back to the home page.
- Settings with recalibrate and camera status.
- A past session that shows session length, elapsed time, and distraction count, including zero.
- Meme storage, so you can choose the bonk meme before a session starts.
- That chosen meme bonking you when the border finishes turning red.

## Deferred From the POC

- Extra meme-vault tools from the original writeup: random meme, custom audio uploads, text-to-speech roasts, and a friend triggering the meme. This build has you choose one meme before the session, then that meme bonks you.
- Extra session stats beyond session length, elapsed time, and distraction count.
- Past sessions as cards. For now, each past session is a line of text.
- Slumping and any sitting-posture score. Removed, not saved as a later feature.

## Possible Later Enhancements

- Meme intensity, sound, and the larger set of vault tools. From `scope.md > Later` and the original FocusRot writeup.
- A friend taking a snapshot of your surprised face. From `scope.md > Later`.
- Shared rooms, phone overlays, tab tracking, points, streaks, and collectibles. From `scope.md > Later`.

## Non-Goals

- Treating every look away as an instant failure. From `scope.md > Explicitly Cut`.
- Showing the meme the instant you look away. The meme waits until the border finishes turning red.
- Slumping, slouching, or grading how you sit in the chair.
- An iPhone border over other apps. From `scope.md > Explicitly Cut`.

## How You Know It Works

- [ ] The home page shows profile, settings, past sessions, meme storage, and start. With no past session, it says "Nothing here yet" and hints to press start.
- [ ] Before the session, you can choose the meme that will bonk you.
- [ ] If the camera is blocked or your face cannot be seen, a notification tells you to unblock the camera and show your face. "Session Start!" waits until your face can be seen.
- [ ] You look at your laptop, phone, or notebook. FocusRot saves that eye angle. "Session Start!" appears on a black faded background and then fades out.
- [ ] On the work, a faded green haze sits around the screen.
- [ ] If you look away, the haze turns red slowly. If you look back before it is fully red, it turns green slowly. No meme appears during that change.
- [ ] If you do not come back, the border finishes turning red, the chosen meme bonks you, and the distraction count goes up by one.
- [ ] If you leave your chair, the border turns red faster than a look away.
- [ ] Pause shows "Session Pause" until you press play. Paused time is left out of session length and included in elapsed time.
- [ ] Stop shows "Session End," fades through black, then shows session length, elapsed time, and the distraction count. Finish returns to the home page, and the session appears as a line of text.

## Open Questions

None.
