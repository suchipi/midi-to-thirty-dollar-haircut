const fs = require("fs");
const midiParser = require("midi-parser-js");

function main(options) {
  const song = fs.readFileSync(options.midiFile);
  const midi = midiParser.parse(song);

  const TYPES = {
    NOTE_ON: 0x9,
  };

  let out = [`!speed@${options.bpm}`];

  const timeNotesMap = {};
  function addToTimeNotesMap(time, pitch, trackNr) {
    // save trackNr (hey we should be using typescript) to map to instument later
    if (timeNotesMap[time] == null) {
      timeNotesMap[time] = [[pitch, trackNr]];
    } else {
      timeNotesMap[time].push([pitch, trackNr]);
    }
  }

  function parseTrack(trackNr) {
    const events = midi.track[trackNr].event;

    let currentTime = 0;
    let timeSinceLastNoteOn = 0;

    for (const event of events) {
      timeSinceLastNoteOn += event.deltaTime;

      if (event.type !== TYPES.NOTE_ON) continue;

      const pitch = event?.data?.[0];
      if (!pitch) continue;

      if (
        timeSinceLastNoteOn >= options.ignoredDeltaCutoff &&
        timeSinceLastNoteOn > 0
      ) {
        currentTime +=
          Math.max(0, timeSinceLastNoteOn - options.waitCompensation) *
          options.waitMultiplier;
      }

      timeSinceLastNoteOn = 0;

      addToTimeNotesMap(currentTime, pitch, trackNr);
    }
  }

  for (const trackNr of Object.keys(options.trackInstrumentMap)) {
    parseTrack(trackNr);
  }

  const sortedTimeNotesMapEntries = Object.entries(timeNotesMap).sort(
    ([noteTimeA], [noteTimeB]) => noteTimeA - noteTimeB
  );

  let currentTime = 0;
  for (const [noteTime, notes] of sortedTimeNotesMapEntries) {
    out.push(
      `!stop@${noteTime - currentTime}`,
      notes
        .map(
          ([pitch, track]) =>
            `${options.trackInstrumentMap[track]}@${
              pitch - 65 + options.pitchShift
            }`
        )
        .join("|!combine|")
    );
    currentTime = noteTime;
  }

  // not efficient but its ok
  let outStr = out.join("|");
  out = outStr.split("|").slice(0, options.maxParts);
  outStr = out.join("|");

  console.log(outStr);
  console.log({ parts: out.length });
  fs.writeFileSync("./out.🗿", outStr);
}

main({
  midiFile: "Chewie_Ninya_Portal_-_Still_Alive_Septet.mid",
  trackInstrumentMap: {
    // 0: "noteblock_harp",
    1: "noteblock_bass",
  },
  maxParts: Infinity,
  maxParts: 500,
  bpm: 10000,
  ignoredDeltaCutoff: 0,
  pitchShift: 5,
  waitCompensation: 0,
  // waitMultiplier: 1,
  waitMultiplier: 1 / 10,
});
