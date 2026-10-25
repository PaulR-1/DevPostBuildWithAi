import { elapsedMs, endClock, formatDuration, pauseClock, resumeClock, sessionLengthMs, startClock } from "../src/sessionClock.ts";
import { memeIsTooLong } from "../src/memes.ts";
import { angleFromStored, focusState, showMeme, START_FOCUS, stepFocus, type Focus, type FocusReading } from "../src/tracking/focusState.ts";

const safe = { yaw: 0, pitch: -10 };
const onWork = { faceVisible: true, bodyVisible: true, yaw: 3, pitch: -8 };
const lookingAway = { faceVisible: true, bodyVisible: true, yaw: 40, pitch: -8 };
const leftChair = { faceVisible: false, bodyVisible: false, yaw: 0, pitch: 0 };
const handOverFace = { faceVisible: false, bodyVisible: true, yaw: 0, pitch: 0 };
const FRAME = 1 / 30;

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}

function run(start: Focus, reading: FocusReading, seconds: number) {
  let f = start;
  for (let t = 0; t < seconds; t += FRAME) f = stepFocus(f, reading, safe, FRAME);
  return f;
}

function secondsUntilRed(reading: FocusReading) {
  let f = START_FOCUS;
  let t = 0;
  while (f.redness < 1 && t < 60) {
    f = stepFocus(f, reading, safe, FRAME);
    t += FRAME;
  }
  return t;
}

check("on the work stays green", run(START_FOCUS, onWork, 10).redness === 0);
check("on the work state", focusState(START_FOCUS) === "on-work");

const away = run(START_FOCUS, lookingAway, 2);
check("looking away turns red slowly, not instantly", away.redness > 0 && away.redness < 1, away.redness.toFixed(2));
check("looking away is drifting before full red", focusState(away) === "drifting");

const back = run(away, onWork, 0.3);
check("looking back turns green again", back.redness < away.redness, `${away.redness.toFixed(2)} -> ${back.redness.toFixed(2)}`);
check("coming back in time reaches full green", run(away, onWork, 5).redness === 0);
let fromRed = { ...START_FOCUS, redness: 1, bonked: true };
let greenTime = 0;
while (fromRed.redness > 0 && greenTime < 10) {
  fromRed = stepFocus(fromRed, onWork, safe, FRAME);
  greenTime += FRAME;
}
check("looking back is 25% faster than 3 seconds", greenTime < 2.5 && greenTime > 2.2, `${greenTime.toFixed(2)}s`);

const awayTime = secondsUntilRed(lookingAway);
const chairTime = secondsUntilRed(leftChair);
check("sustained looking away reaches full red", run(START_FOCUS, lookingAway, 10).redness === 1, `${awayTime.toFixed(1)}s`);
check("full red is left-work", focusState({ ...START_FOCUS, redness: 1 }) === "left-work");
check("leaving the chair turns red faster", chairTime < awayTime, `${chairTime.toFixed(1)}s vs ${awayTime.toFixed(1)}s`);

check("a look-away Bonk is about 25% faster than 8 seconds", awayTime <= 8 / 1.25 + 0.05 && awayTime > 6, `${awayTime.toFixed(2)}s`);
check("leaving the screen without pausing is at least 50% faster than 5 seconds", chairTime <= 5 / 1.5 + 0.05, `${chairTime.toFixed(2)}s`);

const blip = run(START_FOCUS, leftChair, 0.8);
check("a short face blip does not count as leaving the chair", blip.redness === 0 && focusState(blip) === "on-work");
check("face missing past the grace is left-chair", focusState(run(START_FOCUS, leftChair, 2)) === "left-chair");
check("face coming back resets the grace", run(blip, onWork, FRAME).missingSeconds === 0);

const covered = run(START_FOCUS, handOverFace, 10);
check("hand over face with body in chair does not turn red", covered.redness === 0 && focusState(covered) === "face-hidden");
const coveredWhileDrifting = run(away, handOverFace, 5);
check("hand over face holds the border where it was", coveredWhileDrifting.redness === away.redness);

check("drifting does not count a distraction", away.distractions === 0);
const bonk = run(START_FOCUS, lookingAway, 20);
check("one sustained look-away counts exactly one distraction", bonk.distractions === 1 && showMeme(bonk), `${bonk.distractions}`);
const halfBack = run(run(bonk, onWork, 1), lookingAway, 10);
check("looking back only part way then away again does not count twice", halfBack.distractions === 1);
const second = run(run(bonk, onWork, 5), lookingAway, 10);
check("coming back fully then looking away again counts a second", second.distractions === 2, `${second.distractions}`);
check("meme hides once you look back", !showMeme(run(bonk, onWork, 0.1)));
check("leaving the chair counts as a distraction too", run(START_FOCUS, leftChair, 10).distractions === 1);

const yawEdge = { faceVisible: true, bodyVisible: true, yaw: safe.yaw + 15, pitch: safe.pitch };
const yawPast = { ...yawEdge, yaw: safe.yaw + 16 };
check("15 degrees left or right still counts as on the work", run(START_FOCUS, yawEdge, 2).redness === 0);
check("past 15 degrees starts turning red", run(START_FOCUS, yawPast, 1).redness > 0);
const pitchEdge = { faceVisible: true, bodyVisible: true, yaw: safe.yaw, pitch: safe.pitch + 12 };
const pitchPast = { ...pitchEdge, pitch: safe.pitch + 13 };
check("12 degrees up or down still counts as on the work", run(START_FOCUS, pitchEdge, 2).redness === 0);
check("past 12 degrees starts turning red", run(START_FOCUS, pitchPast, 1).redness > 0);

let shown = START_FOCUS;
let shownFor = 0;
while (!showMeme(shown) && shownFor < 20) {
  shown = stepFocus(shown, lookingAway, safe, FRAME);
  shownFor += FRAME;
}
const hid = run(shown, onWork, 0.1);
const flashed = run(hid, lookingAway, 1);
check("the meme stays hidden for 3 seconds after it appears", showMeme(shown) && !showMeme(hid) && flashed.redness >= 1 && !showMeme(flashed));
const afterGap = run(flashed, lookingAway, 3);
check("the meme can pop again after the 3 second gap", showMeme(afterGap) && afterGap.distractions === 1);

const storedSingle = angleFromStored({ yaw: 4, pitch: 5 });
const storedList = angleFromStored([{ yaw: 1, pitch: 2 }, { yaw: 8, pitch: 9 }]);
check("a meme at 15 seconds is allowed", !memeIsTooLong(15));
check("a meme past 15 seconds is refused", memeIsTooLong(15.01));
check("an unreadable meme length is refused", memeIsTooLong(Number.NaN));
check("a saved angle loads as one angle", storedSingle?.yaw === 4);
check("a stored list keeps its first angle", storedList?.yaw === 1);

let clock = startClock(0);
clock = pauseClock(clock, 60_000);
check("paused clock stops session length", sessionLengthMs(clock, 90_000) === 60_000);
clock = resumeClock(clock, 100_000);
clock = endClock(clock, 160_000);
const length = sessionLengthMs(clock, 999_999);
const elapsed = elapsedMs(clock, 999_999);
check("session length leaves out paused time", length === 120_000, formatDuration(length));
check("elapsed time includes paused time", elapsed === 160_000, formatDuration(elapsed));
check("difference is exactly the paused time", elapsed - length === 40_000);
check("stopping while paused still leaves out the pause", sessionLengthMs(endClock(pauseClock(startClock(0), 10_000), 25_000), 0) === 10_000);

if (failures) throw new Error(`${failures} check(s) failed`);
console.log("\nAll checks passed");
