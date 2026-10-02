// Everything you are likely to edit lives in this file.
export const SITE = {
  // Stripe. productPath tags each Checkout Session so the webhook ignores other sales on the same account.
  productPath: "sharan-premium-content",
  // Name shown on the Stripe checkout page, on the receipt and in analytics.
  productName: "Sharan's Premium Content",

  // Page copy
  name: "Sharan Gohar",
  domain: "sharangohar.com",
  eyebrow: "Private. Unedited. Members only.",
  headline: "Sharan's Premium Content",
  lede: "Recordings and sessions from inside my business that are not published anywhere else. Unedited, so you see exactly how the work is done.",
  price: "$1",

  // Money back promise, in days. Set to 0 to remove every mention of it from the site.
  guaranteeDays: 0,

  // The three numbers under the hero. Empty the list to hide the strip.
  proof: [
    { figure: "40+", label: "countries running my software" },
    { figure: "6 yrs", label: "building and selling Enatega" },
    { figure: "100+", label: "platforms launched for founders" },
  ],

  // "What is inside" list. Each item is [bold part, rest of the sentence].
  inside: [
    ["A real sales call, 25 minutes, nothing cut.", "The buyer's questions, the pricing moment and the first objection."],
    ["The consultancy session that followed.", "Launch plan, what was agreed and the follow up that kept things moving."],
    ["Lifetime access.", "Watch it as many times as you like."],
  ],

  // Short lines in the pricing box.
  includes: ["Everything inside, unedited", "Lifetime access", "Watch as many times as you like"],

  whoFor: "You sell your own service or software, freelance, run an agency, or want to build something that pays you. You would rather watch real work than read a summary of it.",
  whoNot: "Skip it if you want a motivational talk. This is the real thing, not a lecture about it.",

  about: "Founder of Enatega. I have run my own sales and client work for six years, and the software I sell now runs in 40+ countries. This is the content I keep behind a paywall: real calls and sessions from my business, unedited.",

  // Social links. Shown in the about card and the footer.
  instagram: "https://www.instagram.com/sharan.gohar/",

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
