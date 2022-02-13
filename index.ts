import fs from "fs";
import midiParser from "midi-parser-js";

type AppOptions = {
  midiFile: string;
  trackInstrumentMap: { [key: number]: string };
  maxParts: number;
  bpm: number; // max 10000
  ignoredDeltaCutoff: number;
  pitchShift: number;
  waitCompensation: number;
  waitMultiplier: number;
};

function main(options: AppOptions) {
  const song = fs.readFileSync(options.midiFile);
  const midi = midiParser.parse(song);

  const TYPES = {
    NOTE_ON: 0x9,
  };

  const out = [`!speed@${options.bpm}`];

  const timeNotesMap = new Map<
    number,
    Array<{ pitch: number; trackNumber: number }>
  >();
  function addToTimeNotesMap(time: number, pitch: number, trackNumber: number) {
    let notes = timeNotesMap.get(time);
    if (!notes) {
      notes = [];
    }

    notes.push({
      pitch,
      trackNumber,
    });

    timeNotesMap.set(time, notes);
  }

  function parseTrack(trackNumber: number) {
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
    parseTrack(trackNumber as any as number);
  }

  const sortedTimeNotesMapEntries = Array.from(timeNotesMap).sort(
    ([noteTimeA], [noteTimeB]) => noteTimeA - noteTimeB
  );

  let currentTime = 0;
  for (const [noteTime, notes] of sortedTimeNotesMapEntries) {
    out.push(`!stop@${noteTime - currentTime}`);

    for (let i = 0; i < notes.length; i++) {
      const { pitch, trackNumber } = notes[i];

      out.push(
        `${options.trackInstrumentMap[trackNumber]}@${
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
  midiFile: "Ugh.mid",
  trackInstrumentMap: {
    0: "noteblock_harp",
    1: "noteblock_harp",
    2: "noteblock_harp",
    3: "noteblock_harp",
    4: "noteblock_harp",
    5: "noteblock_harp",
    6: "noteblock_harp",
    7: "noteblock_harp",
    8: "noteblock_harp",
    9: "noteblock_harp",
    10: "noteblock_harp",
    11: "noteblock_harp",
    12: "noteblock_harp",
    13: "noteblock_harp",
    14: "noteblock_harp",
    15: "noteblock_harp",
    16: "noteblock_harp",
    17: "noteblock_harp",
    18: "noteblock_harp",
    19: "noteblock_harp",
    20: "noteblock_harp",
    21: "noteblock_harp",
  },
  maxParts: 500,
  bpm: 10000,
  ignoredDeltaCutoff: 0,
  pitchShift: 5,
  waitCompensation: 0,
  waitMultiplier: 1 / 3,
});
