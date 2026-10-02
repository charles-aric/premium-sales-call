// Everything you are likely to edit lives in this file.
export const SITE = {
  // Stripe. productPath tags each Checkout Session so the webhook ignores other sales on the same account.
  productPath: "sharan-premium-content",
  // Name shown on the Stripe checkout page, on the receipt and in analytics.
  productName: "Sharan's Premium Content",

  // Page copy
  name: "Sharan Gohar",
  domain: "sharangohar.com",
  eyebrow: "Real call. Unedited. 25 minutes.",
  headline: "Sit in on the sales call that closed a software deal.",
  lede: "You hear the questions, the pricing talk, the objections and how the deal moved forward. Then the consultancy session that followed.",
  price: "$1",

  // Money back promise, in days. Set to 0 to remove every mention of it from the site.
  guaranteeDays: 7,

  // The three numbers under the hero. Empty the list to hide the strip.
  proof: [
    { figure: "40+", label: "countries running my software" },
    { figure: "6 yrs", label: "selling Enatega on calls like this one" },
    { figure: "100+", label: "platforms launched for founders" },
  ],

  // "What is inside" list. Each item is [bold part, rest of the sentence].
  inside: [
    ["The full sales call, 25 minutes, nothing cut.", "The buyer's real questions, the pricing moment and the first objection."],
    ["The consultancy session that followed.", "Launch plan, what was agreed and the follow up that kept the deal moving."],
    ["Lifetime access.", "Watch it as many times as you like."],
  ],

  whoFor: "You sell your own service or software, freelance, run an agency, or want to leave a job and build something that pays you without you on every call.",
  whoNot: "Skip it if you want a motivational talk. This is a recording of work, not a lecture about it.",

  about: "Founder of Enatega. I have run the sales calls myself for six years, and the software I sell on them now runs in 40+ countries. I never sold it in Pakistan. This is the first time I am letting anyone watch one of those calls.",

  // Questions section. The question about signing in again is added by the page itself.
  faq: [
    ["Is the buyer's name in it?", "No. The buyer agreed to the recording and their company details are blurred."],
    ["Can I download it?", "No, it streams. You can watch it as many times as you like."],
    ["Is it in English or Urdu?", "The call is in English, the buyer is overseas. The consultancy session is mixed."],
  ],

  // Video length and chapter list. "at" is the start minute.
  durationMinutes: 25,
  // Leave this false until the chapter minutes below match the real video.
  // They currently run to minute 43 while the video is 25 minutes long.
  showChapters: false,
  chapters: [
    { at: 0, label: "Opening the call and finding out what the buyer needs" },
    { at: 8, label: "Walking through the product against those needs" },
    { at: 19, label: "The pricing conversation and the first objection" },
    { at: 27, label: "Handling \"we need to think about it\"" },
    { at: 34, label: "Consultancy session, launch plan and next steps" },
    { at: 43, label: "Closing, follow-up and what was agreed" },
  ],

  // How many browsers one purchase can sign in on. The Instagram in-app browser counts as one,
  // so 1 would lock a buyer out as soon as they open the site in Safari or Chrome.
  maxDevices: 3,
};
