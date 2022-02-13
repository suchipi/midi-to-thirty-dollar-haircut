const fs = require("fs");
const midiParser = require("midi-parser-js");

function main(options) {
  const song = fs.readFileSync(options.midiFile);
  const midi = midiParser.parse(song);

  const TYPES = {
    NOTE_ON: 0x9,
  };

  const out = [`!speed@${options.bpm}`];

  const timeNotesMap = {};
  function addToTimeNotesMap(time, pitch, trackNumber) {
    if (timeNotesMap[time] == null) {
      timeNotesMap[time] = [[pitch, trackNumber]];
    } else {
      timeNotesMap[time].push([pitch, trackNumber]);
    }
  }

  function parseTrack(trackNumber) {
    const events = midi.track[trackNumber].event;

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

      addToTimeNotesMap(currentTime, pitch, trackNumber);
    }
  }

  for (const trackNumber of Object.keys(options.trackInstrumentMap)) {
    parseTrack(trackNumber);
  }

  const sortedTimeNotesMapEntries = Object.entries(timeNotesMap).sort(
    ([noteTimeA], [noteTimeB]) => noteTimeA - noteTimeB
  );

  let currentTime = 0;
  for (const [noteTime, notes] of sortedTimeNotesMapEntries) {
    out.push(`!stop@${noteTime - currentTime}`);

    for (let i = 0; i < notes.length; i++) {
      const [pitch, track] = notes[i];

      out.push(
        `${options.trackInstrumentMap[track]}@${
          pitch - 65 + options.pitchShift
        }`
      );

      if (i !== notes.length - 1) {
        out.push("!combine");
      }
    }

    currentTime = noteTime;
  }

  const clampedOut = out.slice(0, options.maxParts);
  const outStr = clampedOut.slice(0, options.maxParts).join("|");

  console.log(outStr);
  console.log({ parts: clampedOut.length });
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
