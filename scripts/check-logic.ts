import { focusState, START_FOCUS, stepFocus, type Focus, type FocusReading } from "../src/tracking/focusState.ts";

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

const awayTime = secondsUntilRed(lookingAway);
const chairTime = secondsUntilRed(leftChair);
check("sustained looking away reaches full red", run(START_FOCUS, lookingAway, 10).redness === 1, `${awayTime.toFixed(1)}s`);
check("full red is left-work", focusState({ ...START_FOCUS, redness: 1 }) === "left-work");
check("leaving the chair turns red faster", chairTime < awayTime, `${chairTime.toFixed(1)}s vs ${awayTime.toFixed(1)}s`);

const blip = run(START_FOCUS, leftChair, 1);
check("a short face blip does not count as leaving the chair", blip.redness === 0 && focusState(blip) === "on-work");
check("face missing past the grace is left-chair", focusState(run(START_FOCUS, leftChair, 2)) === "left-chair");
check("face coming back resets the grace", run(blip, onWork, FRAME).missingSeconds === 0);

const covered = run(START_FOCUS, handOverFace, 10);
check("hand over face with body in chair does not turn red", covered.redness === 0 && focusState(covered) === "face-hidden");
const coveredWhileDrifting = run(away, handOverFace, 5);
check("hand over face holds the border where it was", coveredWhileDrifting.redness === away.redness);

if (failures) throw new Error(`${failures} check(s) failed`);
console.log("\nAll checks passed");
