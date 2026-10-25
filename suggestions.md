# Suggestions

Not applied. The running app still uses one safe angle, a 15° by 12° box, and a green border. The 3 second meme wait is already in the app and is not part of these suggestions.

## On-screen look

Looking at the laptop, a little off the saved angle, currently turns the border red. The saved angle is one direction. Left/right gaze counts the iris very strongly (`EYE_YAW_GAIN` is 170 in `src/tracking/faceTracking.ts`), so a small slide of the eye across the screen is already more than the 15° limit in `src/tracking/focusState.ts`.

Apply both, then recalibrate while looking at the part of the screen you actually use.

| What | Now | Suggested |
| --- | --- | --- |
| Left/right safe box (`yawTolerance`) | 15° | 30° |
| Up/down safe box (`pitchTolerance`) | 12° | 20° |
| Iris left/right weight (`EYE_YAW_GAIN`) | 170 | 80 |
| Eye up/down range (`EYE_PITCH_RANGE`) | 35 | 16 |

Leave these as they are: look-away about 6.4 seconds to full red, return to green about 2.4 seconds, left-the-chair timing, and the 3 second meme wait. A head turn toward a phone should still leave the box and reach red.

## Several saved angles

Optional, and separate from the box above. Calibration asks whether to save more than one angle.

- **No.** One countdown and one sample, same as today. The border stays green.
- **Yes.** Calibrate a spot, then **Add another** or **Done**. Stop at 3. Done needs at least one spot.
- In the session, you are on the work if your eyes are inside the safe box of **any** saved spot.
- **Use saved angles** skips a new capture when a list is already stored.
- Recalibrate replaces the whole list. Forget deletes the whole list. A running session keeps the previous list until the new calibration finishes.
- Store the list in IndexedDB. An older save that is one angle loads as a one-item list.

Border by the order the spots were saved:

| Spot | Color |
| --- | --- |
| 1st | Green |
| 2nd | Blue |
| 3rd | Violet |

Switching spots fades over about 0.6 seconds. Each color still fades toward red when you leave every spot. One saved spot stays green. Do not slide the hue the long way through the other colors on the way to red.
