// Everything you are likely to edit lives in this file.
export const SITE = {
  // FastSpring
  storefront: "enatega.test.onfastspring.com/popup-sales-call-recording", // remove ".test" to go live
  productPath: "sharan-sales-call-recording",
  sblVersion: "1.0.9",

  // Page copy
  name: "Sharan",
  headline: "Sit in on a real sales call with Sharan.",
  lede: "One full sales call and the consultancy session that followed, recorded and unedited. You hear the questions, the pricing talk, the objections and how the deal moved forward.",
  price: "$20",

  // Video length and chapter list. "at" is the start minute.
  durationMinutes: 47,
  chapters: [
    { at: 0, label: "Opening the call and finding out what the buyer needs" },
    { at: 8, label: "Walking through the product against those needs" },
    { at: 19, label: "The pricing conversation and the first objection" },
    { at: 27, label: "Handling \"we need to think about it\"" },
    { at: 34, label: "Consultancy session, launch plan and next steps" },
    { at: 43, label: "Closing, follow-up and what was agreed" },
  ],

  // How many browsers one purchase can sign in on.
  maxDevices: 3,
};
