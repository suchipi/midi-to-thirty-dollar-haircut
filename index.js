const fs = require("fs");
const midiParser = require("midi-parser-js");

function main(options) {
  const song = fs.readFileSync(options.midiFile);
  const midi = midiParser.parse(song);

  const TYPES = {
    NOTE_ON: 0x9,
  };

  let out = [];

  function write(label, at = null) {
    out.push({ label, at });
  }

  write("!speed", options.bpm);

  const events = midi.track[options.track].event;

  let timeSinceLastNoteOn = 0;
  for (const event of events) {
    if (out.length >= options.maxParts) break;

    timeSinceLastNoteOn += event.deltaTime;

    if (event.type !== TYPES.NOTE_ON) continue;

    const pitch = event?.data?.[0];
    if (!pitch) continue;

    if (
      timeSinceLastNoteOn >= options.ignoredDeltaCutoff &&
      timeSinceLastNoteOn > 0
    ) {
      write(
        "!stop",
        Math.max(0, timeSinceLastNoteOn - options.waitCompensation) *
          options.waitMultiplier
      );
    } else if (out.length > 1) {
      write("!combine");
    }
    timeSinceLastNoteOn = 0;

    write(options.instrument, pitch - 65 + options.pitchShift);
  }

  const outStr = out
    .map((part) => (part.at ? `${part.label}@${part.at}` : part.label))
    .join("|");
  console.log(outStr);
  console.log({ parts: out.length });
  fs.writeFileSync("./out.🗿", outStr);
}

main({
  midiFile: "./Nozomi_Tenma_M.I.L.F_-_Friday_Night_Funkin.mid",
  instrument: "🚫",
  track: 1,
  maxParts: Infinity,
  maxParts: 500,
  bpm: 10000,
  ignoredDeltaCutoff: 0,
  pitchShift: 5,
  waitCompensation: 0,
  // waitMultiplier: 1,
  waitMultiplier: 1 / 10,
});
