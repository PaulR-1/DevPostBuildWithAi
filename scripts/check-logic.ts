import { stepRedness, focusState } from "../src/tracking/focusState.ts";

const safe = { yaw: 0, pitch: -10 };
const onWork = { faceVisible: true, yaw: 3, pitch: -8 };
const lookingAway = { faceVisible: true, yaw: 40, pitch: -8 };
const leftChair = { faceVisible: false, yaw: 0, pitch: 0 };
const FRAME = 1 / 30;

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}

function run(start: number, reading: typeof onWork, seconds: number) {
  let r = start;
  for (let t = 0; t < seconds; t += FRAME) r = stepRedness(r, reading, safe, FRAME);
  return r;
}

function secondsUntilRed(reading: typeof onWork) {
  let r = 0;
  let t = 0;
  while (r < 1 && t < 60) {
    r = stepRedness(r, reading, safe, FRAME);
    t += FRAME;
  }
  return t;
}

check("on the work stays green", run(0, onWork, 10) === 0);
check("on the work state", focusState(0, onWork) === "on-work");

const afterTwoSeconds = run(0, lookingAway, 2);
check("looking away turns red slowly, not instantly", afterTwoSeconds > 0 && afterTwoSeconds < 1, afterTwoSeconds.toFixed(2));
check("looking away is drifting before full red", focusState(afterTwoSeconds, lookingAway) === "drifting");

const back = run(afterTwoSeconds, onWork, 1);
check("looking back turns green again", back < afterTwoSeconds, `${afterTwoSeconds.toFixed(2)} -> ${back.toFixed(2)}`);
check("coming back in time reaches full green", run(afterTwoSeconds, onWork, 5) === 0);

const awayTime = secondsUntilRed(lookingAway);
const chairTime = secondsUntilRed(leftChair);
check("sustained looking away reaches full red", run(0, lookingAway, 10) === 1, `${awayTime.toFixed(1)}s`);
check("full red is left-work", focusState(1, lookingAway) === "left-work");
check("leaving the chair turns red faster", chairTime < awayTime, `${chairTime.toFixed(1)}s vs ${awayTime.toFixed(1)}s`);
check("missing face is left-chair", focusState(0.5, leftChair) === "left-chair");

if (failures) throw new Error(`${failures} check(s) failed`);
console.log("\nAll checks passed");
