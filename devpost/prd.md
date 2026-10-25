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
7. If you keep looking away, the border finishes turning red. The meme you chose pops up and bonks you. That moment counts as one distraction. The meme cannot pop again until 3 seconds have passed.
8. If you leave your chair, the border turns red faster than it does when your eyes look away.
9. You can click the app icon to stop the session, pause the session, or open settings.
10. When you stop, the session ends. The screen shows "Session End," like "Session Start!" Then the screen fades through black.
11. You see the session analytics: session length, elapsed time, and how many times you got distracted. Session length leaves out paused time. Elapsed time includes paused time. A button says Finish.
12. You press Finish. You return to the home page. The finished session is a line of text there. You can tap it to open those same stats.

## Screens and Layout

- **Opening page.** An account menu opens Profile and Settings. A launch card shows the chosen meme and Start, plus totals for Bonks, focus time, sessions, and a day streak. Meme storage and past sessions sit below that. These stay off the session screen.
- **Calibration.** You see the ask to look at your laptop, phone, or notebook. This happens before "Session Start!"
- **Session.** Your camera fills the screen. The only extra control is the small app-icon bubble. The border around the edges of the screen is the sign of whether you are on the work.
- **Session end.** "Session End" shows in the same style as "Session Start!" The screen then fades through black.
- **Session analytics.** You see session length, elapsed time, and the Bonk count. A Finish button takes you back to the home page.
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

You look back before the border is fully red. The border becomes green again in about 2.4 seconds from full red. That is 25% faster than the earlier 3 seconds, the same speedup as a look-away.

You do not look back. The border finishes turning red in about 6.4 seconds. That is 25% faster than the earlier 8 seconds, so the Bonk count goes up sooner. The meme you chose before the session pops up and bonks you. That counts as one Bonk. The meme does not appear the instant you look away, and it cannot pop again until 3 seconds have passed. The built-in memes are Tralalero Tralala (his sound, then bubbles, no bonk hit), Dust Baby (a white flash as the flashbang sound starts), and Tung Tung Tung Sahur (his sound, then a bonk hit). A meme you add is a picture, a picture with a sound, or a video, at most 15 seconds, and it always ends with the bonk hit. `scope.md > Explicitly Cut` gives you a chance to come back first.

### Leaving the chair

You leave your chair and you do not pause. The border reaches full red in about 3.3 seconds. That is 50% faster than the earlier 5 seconds, and still faster than a look away. A gap shorter than 1 second does not count. The session clock does not speed up. Only the border does.

You cover your face with your hand, but you are still in your chair. That is not leaving the chair. The border stays where it is until FocusRot can see your eyes again. A hand counts when a wrist or index finger is inside the last face square. You chose this at the first build checkpoint, for clarity.

You look down until your face leaves the camera, your shoulders stay, and your hand is not in that square. That is a look-away, not leaving the chair. The border reaches full red in about 6.4 seconds.

Noted before removal, as you asked: slumping is out. No slouch detection, no "bad sitting" check, and no other function about how you sit while still in the chair. `scope.md > The Unique Kernel` watches posture. For this proof, posture means whether you have left the chair.

### Session controls

The bubble is the app icon. Clicking it can stop the session, pause the session, or open settings.

Settings opens from the account menu and from the session bubble. The safe angle, including recalibrate and forget, is only in Settings opened from the session bubble. Forget during a running session closes Settings and asks you to calibrate again. The border keeps using the last angle until that new calibrate finishes, so it does not freeze. Camera shows whether the camera is allowed, and can ask Chrome to allow it. Sound has a meme volume for the bonk and your meme sounds, and an ambient volume for clicks, the 3-2-1 countdown, and the sounds when a session starts and ends. History can delete every saved session from this browser, after you confirm.

Pause shows the words "Session Pause" in the same font as "Session Start!" That screen stays until you unpause. The pause button’s place shows a play button. You press play to unpause.

Stop ends the session. The screen shows "Session End," like the start, then fades through black. The next screen shows the session analytics: session length, elapsed time, and distraction count. You press Finish and return to the home page.

### Session history

A finished session keeps three stats. Session length is how long it ran, and paused time is not included. Elapsed time is all of the time combined, including paused time. The Bonk count includes zero. On the home page those sessions also add up: total Bonks, total focus time, how many sessions, a streak of days in a row, and a bar for each of the last eight sessions.

You count one Bonk when the meme comes out. The meme comes out when the border finishes turning red and you have not come back. Looking away reaches that in about 6.4 seconds. Leaving the chair without pausing reaches it in about 3.3 seconds.

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
- Settings shows the camera, sound, and history. From the session bubble it also shows the safe angle. Recalibrate saves a new safe eye angle. Forget drops the saved angle. Camera shows whether the camera is allowed, and can ask Chrome to allow it. Meme volume covers the bonk and your meme sounds. Ambient volume covers clicks, the 3-2-1 countdown, and the sounds when a session starts and ends. History can delete every saved session after you confirm.
- Profile shows a name, a profile photo, and a favourite meme. The favourite meme is a display. It does not pick the meme for today's session. The name and photo open from the account menu.
- There are sample memes, and you can add up to 20 of your own images. Before a session starts, you choose which one will bonk you. Adding your own image was brought in with the home-screen polish. Random choice, custom audio, and text-to-speech stay out.
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
- Settings with the safe angle, camera status, and a way to clear saved sessions.
- A past session that shows session length, elapsed time, and the Bonk count, including zero.
- Home totals for Bonks, focus time, sessions, and a day streak.
- Meme storage, including up to 20 of your own images, so you can choose the bonk meme before a session starts.
- That chosen meme bonking you when the border finishes turning red.

## Deferred From the POC

- Extra meme-vault tools from the original writeup: random meme, custom audio uploads, text-to-speech roasts, and a friend triggering the meme. This build lets you choose a sample meme or add your own image, then that meme bonks you.
- Points and unlockable collectibles. A day streak, total Bonks, and total focus time are on the home page. They are sums of saved sessions, not a points system.
- Past sessions as cards. For now, each past session is a line of text.
- Slumping and any sitting-posture score. Removed, not saved as a later feature.

## Possible Later Enhancements

- Meme intensity, sound, and the larger set of vault tools. From `scope.md > Later` and the original FocusRot writeup.
- A friend taking a snapshot of your surprised face. From `scope.md > Later`.
- Shared rooms, phone overlays, tab tracking, points, and collectibles. From `scope.md > Later`. The day streak is already on the home page.

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
- [ ] If you do not come back, the border finishes turning red, the chosen meme bonks you, and the distraction count goes up by one. The meme waits 3 seconds before it can pop again.
- [ ] If you leave your chair, the border turns red faster than a look away.
- [ ] Pause shows "Session Pause" until you press play. Paused time is left out of session length and included in elapsed time.
- [ ] Stop shows "Session End," fades through black, then shows session length, elapsed time, and the distraction count. Finish returns to the home page, and the session appears as a line of text.

## Open Questions

None.
