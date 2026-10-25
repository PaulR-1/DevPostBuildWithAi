import { elapsedMs, endClock, formatDuration, pauseClock, resumeClock, sessionLengthMs, startClock } from "../src/sessionClock.ts";
import { memeIsTooLong } from "../src/memes.ts";
import { clampTrim } from "../src/trimMedia.ts";
import { handInFaceBox, holdLock, shouldersNearLock, type FaceBox, type FaceSpot } from "../src/tracking/faceLock.ts";
import { angleFromStored, anglesFromStored, focusState, SAFE_COLORS, showMeme, START_FOCUS, stepFocus, type Angle, type Focus, type FocusReading } from "../src/tracking/focusState.ts";

const safe = { yaw: 0, pitch: -10 };
const onWork = { faceVisible: true, bodyVisible: true, handOverFace: false, yaw: 3, pitch: -8 };
const lookingAway = { faceVisible: true, bodyVisible: true, handOverFace: false, yaw: 40, pitch: -8 };
const leftChair = { faceVisible: false, bodyVisible: false, handOverFace: false, yaw: 0, pitch: 0 };
const handOverFace = { faceVisible: false, bodyVisible: true, handOverFace: true, yaw: 0, pitch: 0 };
const lookingDown = { faceVisible: false, bodyVisible: true, handOverFace: false, yaw: 0, pitch: 0 };
const FRAME = 1 / 30;

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}

function run(start: Focus, reading: FocusReading, seconds: number, spots: Angle[] = [safe]) {
  let f = start;
  for (let t = 0; t < seconds; t += FRAME) f = stepFocus(f, reading, spots, FRAME);
  return f;
}

function secondsUntilRed(reading: FocusReading, spots: Angle[] = [safe]) {
  let f = START_FOCUS;
  let t = 0;
  while (f.redness < 1 && t < 60) {
    f = stepFocus(f, reading, spots, FRAME);
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
  fromRed = stepFocus(fromRed, onWork, [safe], FRAME);
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
const down = run(START_FOCUS, lookingDown, 2);
const awaySame = run(START_FOCUS, lookingAway, 2);
check("face gone with no hand turns red like a look-away", down.redness === awaySame.redness && down.redness > 0 && down.redness < 1);
check("face gone with no hand is not the faster chair timer", secondsUntilRed(lookingDown) === awayTime);
check("face gone with no hand can bonk once", run(START_FOCUS, lookingDown, 10).distractions === 1);

check("drifting does not count a distraction", away.distractions === 0);
const bonk = run(START_FOCUS, lookingAway, 20);
check("one sustained look-away counts exactly one distraction", bonk.distractions === 1 && showMeme(bonk), `${bonk.distractions}`);
const halfBack = run(run(bonk, onWork, 1), lookingAway, 10);
check("looking back only part way then away again does not count twice", halfBack.distractions === 1);
const second = run(run(bonk, onWork, 5), lookingAway, 10);
check("coming back fully then looking away again counts a second", second.distractions === 2, `${second.distractions}`);
check("meme hides once you look back", !showMeme(run(bonk, onWork, 0.1)));
check("leaving the chair counts as a distraction too", run(START_FOCUS, leftChair, 10).distractions === 1);

const yawEdge = { faceVisible: true, bodyVisible: true, handOverFace: false, yaw: safe.yaw + 15, pitch: safe.pitch };
const yawPast = { ...yawEdge, yaw: safe.yaw + 16 };
check("15 degrees left or right still counts as on the work", run(START_FOCUS, yawEdge, 2).redness === 0);
check("past 15 degrees starts turning red", run(START_FOCUS, yawPast, 1).redness > 0);
const pitchEdge = { faceVisible: true, bodyVisible: true, handOverFace: false, yaw: safe.yaw, pitch: safe.pitch + 12 };
const pitchPast = { ...pitchEdge, pitch: safe.pitch + 13 };
check("12 degrees up or down still counts as on the work", run(START_FOCUS, pitchEdge, 2).redness === 0);
check("past 12 degrees starts turning red", run(START_FOCUS, pitchPast, 1).redness > 0);

const spots = [
  { yaw: 0, pitch: -10 },
  { yaw: 50, pitch: -10 },
  { yaw: -50, pitch: -10 },
];
const onSecond = { faceVisible: true, bodyVisible: true, handOverFace: false, yaw: 50, pitch: -10 };
const outsideSpots = { faceVisible: true, bodyVisible: true, handOverFace: false, yaw: 25, pitch: -10 };
const secondEdge = { faceVisible: true, bodyVisible: true, handOverFace: false, yaw: 65, pitch: -10 };
const secondPast = { faceVisible: true, bodyVisible: true, handOverFace: false, yaw: 66, pitch: -10 };
check("inside any of three spots stays green", run(START_FOCUS, onSecond, 2, spots).redness === 0);
check("outside every spot reddens on the look-away timer", secondsUntilRed(outsideSpots, spots) === awayTime);
check("15 degrees from a later spot still counts", run(START_FOCUS, secondEdge, 2, spots).redness === 0);
check("past 15 degrees from every spot starts turning red", run(START_FOCUS, secondPast, 1, spots).redness > 0);
const switched = stepFocus(START_FOCUS, onSecond, spots, 0.05);
const colorDist = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) =>
  Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
check(
  "a spot switch eases toward that color instead of jumping",
  switched.activeIndex === 1 && colorDist(switched.border, SAFE_COLORS[0]) < colorDist(switched.border, SAFE_COLORS[1]),
);
const settled = run(switched, onSecond, 2, spots);
check("the eased color arrives on the new spot", colorDist(settled.border, SAFE_COLORS[1]) < colorDist(settled.border, SAFE_COLORS[0]));

let shown = START_FOCUS;
let shownFor = 0;
while (!showMeme(shown) && shownFor < 20) {
  shown = stepFocus(shown, lookingAway, [safe], FRAME);
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
check("a meme past 15 seconds is too long to store whole", memeIsTooLong(15.01));
const pulled = clampTrim(0, 20, 40, "end");
check("a trim cannot be longer than 15 seconds", pulled.end - pulled.start <= 15);
const shortened = clampTrim(2, 6, 40, "end");
check("a trim can be shorter than 15 seconds", shortened.end - shortened.start === 4);
check("an unreadable meme length is refused", memeIsTooLong(Number.NaN));
check("a saved angle loads as one angle", storedSingle?.yaw === 4);
check("a stored list keeps its first angle", storedList?.yaw === 1);
const storedAngles = anglesFromStored([{ yaw: 1, pitch: 2 }, { yaw: 8, pitch: 9 }]);
check("a stored list loads every angle", storedAngles.length === 2 && storedAngles[1].yaw === 8);
check("one stored angle loads as a one-item list", anglesFromStored({ yaw: 4, pitch: 5 }).length === 1);

const seated: FaceSpot = { x: 0.5, y: 0.4, size: 0.2 };
const visitor: FaceSpot = { x: 0.85, y: 0.4, size: 0.18 };
const larger: FaceSpot = { x: 0.2, y: 0.3, size: 0.3 };
const smaller: FaceSpot = { x: 0.7, y: 0.3, size: 0.1 };
const firstLock = holdLock(null, [smaller, larger]);
check("the larger face wins when there is no lock", firstLock.chosen === larger && firstLock.lock === larger);
const nearby: FaceSpot = { x: 0.55, y: 0.42, size: 0.2 };
const stayed = holdLock(seated, [visitor, nearby]);
check("a nearby face keeps the lock", stayed.chosen === nearby && stayed.lock === nearby);
const rejected = holdLock(seated, [visitor]);
check("a far face is rejected and the lock does not move", rejected.chosen === null && rejected.lock === seated);
const returned = holdLock(rejected.lock, [nearby]);
check("a return near the old spot is accepted again", returned.chosen === nearby && returned.lock === nearby);
check("shoulders under the lock still count as the seated person", shouldersNearLock({ x: 0.5, y: 0.7 }, seated));
check("shoulders across the frame do not count", !shouldersNearLock({ x: 0.95, y: 0.9 }, seated));
const faceBox: FaceBox = { x: 0.5, y: 0.4, size: 0.2 };
check("a hand inside the grown face square counts", handInFaceBox({ x: 0.62, y: 0.4 }, faceBox, 1));
check("a hand outside the grown face square does not count", !handInFaceBox({ x: 0.66, y: 0.4 }, faceBox, 1));

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
