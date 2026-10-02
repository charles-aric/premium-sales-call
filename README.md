# Sharan's Premium Content

A Next.js app for Vercel. One sales page with a pricing box, a $1 Stripe checkout, a login page, and a watch page that only opens for the email that paid.

## How it works

1. A visitor clicks "Pay $1 to unlock". `/api/checkout` starts a Stripe Checkout Session and the browser goes to Stripe's payment page.
2. After paying, Stripe sends the buyer back to `/?session_id=...`. `/api/unlock` asks Stripe whether that session was paid, saves the order in Redis, signs the buyer in, and opens `/watch`.
3. Stripe also calls `/api/webhook`, so the order is saved even if the buyer closes the tab before getting back to the site.
4. On any other device, the buyer goes to `/login` and enters the email they paid with and the receipt number from the Stripe receipt email (like `1234-5678`). The receipt number works as their password. The payment ID (`pi_...`) from the Stripe dashboard also works, which helps when supporting a buyer.
5. One purchase can be signed in on as many browsers as `maxDevices` in `lib/site.js`. One more gets refused.
6. The video sits in a private Vercel Blob store, which has no public URLs. `/api/video` gives signed-in buyers a temporary link that expires after 6 hours.
7. A full refund in Stripe removes the order, and the buyer is signed out on their next click.

## What you edit

`lib/site.js` holds the product id, price, headline and all sales page text (proof numbers, what is inside, pricing box lines, who it is for, about, Instagram link), the money back period, video length, chapter list and device limit. Nothing else needs touching.

- `guaranteeDays: 0` removes the money back promise everywhere.
- `showChapters: true` shows the chapter list on the sales page and the jump list on the watch page. Fix the chapter minutes first.
- `productName` is what Stripe shows on the checkout page and receipt.

## Setup

### 1. Deploy to Vercel

- Push this folder to a GitHub repo and import it at vercel.com/new. Vercel detects Next.js by itself. Click Deploy.

### 2. Add Redis

- In the Vercel project, open the Storage tab, click Create Database, pick Upstash for Redis, choose the free plan, and connect it to the project. Vercel adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` for you.

### 3. Add the video

- In the Vercel project, open the Storage tab, click Create Database, and pick Blob.
- Set the access to **Private**. This matters. A public store gives the video a permanent link anyone can share.
- Connect the store to the project when Vercel asks.
- Open the store and upload your video, named `video.mp4`. If the dashboard upload stalls on a file this size, install the Vercel CLI and run `vercel blob put video.mp4 --access private`.
- After the upload, check the pathname the store shows for the file. If it is anything other than `video.mp4`, add an environment variable `VIDEO_PATHNAME` with that exact value.

### 4. Add environment variables in Vercel

Settings, Environment Variables. See `.env.example` for the list.

| Name | Value |
| --- | --- |
| `SESSION_SECRET` | any long random string |
| `STRIPE_SECRET_KEY` | Stripe, Developers, API keys. `sk_test_...` while testing |
| `STRIPE_WEBHOOK_SECRET` | the `whsec_...` signing secret from step 5 |
| `ALLOW_TEST_ORDERS` | `true` while testing, delete before launch |

Then open Deployments and redeploy, so the new variables apply.

### 5. Stripe webhook

- In Stripe, open Developers, Webhooks, and add an endpoint.
- URL `https://YOUR-SITE.vercel.app/api/webhook`
- Events `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `charge.refunded`.
- Copy the endpoint's signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET` and redeploy.
- Do this once in test mode and again in live mode. Each mode has its own endpoint and its own signing secret.
- In Settings, Customer emails, turn on "Successful payments", so buyers get a receipt with the receipt number they sign in with.

### 6. Test

1. With `sk_test_...` keys, pay with the test card `4242 4242 4242 4242`, any future date and any CVC. You should land on `/watch` with the video playing.
2. If the page says it cannot confirm the payment, check the Vercel function logs for `/api/unlock`. A Stripe auth error means `STRIPE_SECRET_KEY` is wrong.
3. Sign out, then sign in at `/login` with the test email and the payment ID (`pi_...`) from the Stripe dashboard. Stripe does not email receipts in test mode, so there is no receipt number yet.
4. Open `/api/video` in a private window. It must say "Payment required".
5. Refund the test payment in Stripe, then reload `/watch`. It must send you to the login page. If it does not, open the webhook endpoint in Stripe and check the delivery. 401 means the signing secret differs. 500 means Redis is not connected.

### 7. Go live

- Swap `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Vercel for the live-mode values.
- Delete `ALLOW_TEST_ORDERS` in Vercel and redeploy.

## Good to know

- Stripe is not a merchant of record. FastSpring collected and paid sales tax and VAT for you. With Stripe that is your job. Stripe Tax can calculate it at checkout once you register where you owe tax.
- Buyers who paid through FastSpring before the switch can still sign in with their FastSpring order reference. Refunds for those orders no longer reach the site, so remove them by hand in Upstash (`paid:THEIR_ORDER_ID`).
- Stripe Checkout shows the payment methods turned on in Stripe, under Settings, Payment methods. PayPal is only offered there in some countries.
- Add `checkout.stripe.com` to unwanted referrals in GA4 (Admin, Data streams, Configure tag settings, List unwanted referrals). Otherwise GA4 credits purchases to Stripe instead of the ad or page that brought the buyer.

- Vercel's free Hobby plan is for non-commercial use. For a paid product, their terms ask for the Pro plan at $1 a month.
- To reset a buyer who ran out of device slots, open the Upstash data browser and delete the key `devices:THEIR_ORDER_ID`. For Stripe orders the order ID is the payment ID (`pi_...`).
- Vercel's free plan includes 1 GB of Blob storage and 10 GB of Blob transfer a month. Your video is 222 MB, so that is about 45 full viewings a month. Past the limit Vercel does not charge you, it blocks the Blob store for 30 days, which means the video stops playing for everyone. Upgrade to Pro before you get close.
- The temporary video link lasts 6 hours. A buyer could pass that link to someone for those hours. Nothing on the web stops screen recording either.
- Buyers type their email at checkout, so the login is only as private as their receipt. For stronger login, add a one-time code by email later. It needs an email service such as Resend and a verified sending domain.
