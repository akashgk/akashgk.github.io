// Everything personal lives here. Edit words, dates and file names in this file only;
// no scene code needs to change. (The link-preview text is static, in index.html's <head>,
// because WhatsApp does not run JavaScript.)
export const CONTENT = {
  name: 'Chris',
  nicknames: ['Takkdu', 'Tukkli'],

  gift: {
    title: 'For Chris',
    hint: '{scroll} to open',
  },

  story: {
    title: 'Our story in the stars',
    hintFirst: '{scroll} to follow the stars',
    hintNext: '{scroll} for the next star',
    hintCard: '{scroll} to go on',
    milestones: [
      { date: '11 Nov 1995', caption: 'The day the world got you.', photo: 'assets/photos/853f11e9437b.webp', photoAlt: 'Baby Chris with her dad' },
      { date: 'School days', caption: 'Just friends, back then.', photo: 'assets/photos/a1e685dac6b8.webp', photoAlt: 'Chris and Akash as school friends' },
      { date: '1 Feb 2018', caption: 'The day it all began.' },
      { date: '16 Apr 2018', caption: 'The first time I saw you in person.', photo: 'assets/photos/29368f49ea7a.webp', photoAlt: 'Chris and Akash, a mirror selfie the day they first met' },
      { date: '29 Nov 2021', caption: 'I asked. You said yes.', photo: 'assets/photos/9564b9e0b5e0.webp', photoAlt: 'Akash on one knee, proposing to Chris' },
      { date: '15 Jan 2022', caption: 'The day you became my wife.', photo: 'assets/photos/44ccc51cd2ff.webp', photoAlt: 'Akash kissing Chris on the forehead under her wedding veil' },
      { date: 'June 2023', caption: 'Delhi and Doha. Miles apart, never far.', photo: 'assets/photos/06ced35d952e.webp', photoAlt: 'Chris looking down, among flowers and warm lights' },
      { date: '7 Jun 2024', caption: 'Together again, for the first time after the distance.', photo: 'assets/photos/87218757f9cb.webp', photoAlt: 'Chris by the marina at sunset' },
      { date: 'Every day apart', caption: 'Missing that beautiful face.', photo: 'assets/photos/1260442e8af8.webp', photoAlt: 'Chris smiling over her shoulder in golden light' },
      { date: 'December 2026', caption: 'Coming home to each other. For good.' },
    ],
  },

  globe: {
    from: { name: 'Delhi', lat: 28.6139, lon: 77.2090 },
    to: { name: 'Doha', lat: 25.2854, lon: 51.5310 },
    caption: "We will soon be together after all these years apart. I love you babe. I'm sorry for keeping you waiting.",
    hint: 'Drag to spin',
  },

  cake: {
    title: 'Make a wish, then blow out the candles.',
    hint: '{scroll} to blow out the candles',
    micButton: 'Use mic?',
    micListening: 'Listening. Blow gently.',
    micFailed: 'No mic needed. {scroll} to blow them out.',
  },

  letter: {
    greeting: 'Happy Birthday,',
    lines: [
      'Happy Bday my super baby girl.',
      'Thanks for believing in me and taking the leap of faith.',
      'I love you.',
      'Happy 31 babe.',
      'I miss you a lot.',
      'Come here soon.',
    ],
    signature: '- Akash',
    replay: 'Replay',
  },

  ui: {
    next: '{scroll} to go on',
    // What {scroll} becomes in the hints above.
    scrollTouch: 'Swipe up',
    scrollMouse: 'Scroll',
    muteLabel: 'Mute music',
    unmuteLabel: 'Play music',
  },

  // Chopin, Nocturne Op. 9 No. 2. Musopen recording, public domain.
  music: { src: 'assets/music/chopin-nocturne-op9-no2.mp3', volume: 0.55, fadeSeconds: 5 },
};
