# Premium sales call video

A Next.js app for Vercel. One sales page, a $1 FastSpring checkout, a login page, and a watch page that only opens for the email that paid.

## How it works

1. A visitor clicks "Pay $1 to unlock" and pays in the FastSpring popup.
2. FastSpring calls `/api/webhook`. The app checks the signature and saves the order in Redis under the buyer's email.
3. The popup closes, the page confirms the order, signs the buyer in, and opens `/watch`.
4. On any other device, the buyer goes to `/login` and enters the email they paid with and the order reference from the FastSpring receipt. The reference works as their password.
5. One purchase can be signed in on 3 browsers. A fourth gets refused.
6. The video sits in a private Vercel Blob store, which has no public URLs. `/api/video` gives signed-in buyers a temporary link that expires after 6 hours.
7. A refund in FastSpring removes the order, and the buyer is signed out on their next click.

## What you edit

`lib/site.js` holds the FastSpring storefront, product path, headline, text, video length, chapter list and device limit. Nothing else needs touching.

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
| `FS_WEBHOOK_SECRET` | another long random string, also pasted into FastSpring |
| `ALLOW_TEST_ORDERS` | `true` while testing, delete before launch |

Then open Deployments and redeploy, so the new variables apply.

### 5. FastSpring webhook

- Developer Tools, Webhooks, add a webhook, then add a URL to it.
- URL `https://YOUR-SITE.vercel.app/api/webhook`
- HMAC SHA256 Secret, the same string as `FS_WEBHOOK_SECRET`.
- Events `order.completed` and `return.created`.
- Make sure the webhook also receives test orders.
- In the popup checkout's settings, add your site's domain to the allowed websites.

### 6. Test

1. Pay with a FastSpring test card. You should land on `/watch` with the video playing.
2. If the page says it cannot confirm the payment, open the webhook's delivery log in FastSpring. 401 means the secrets differ. 500 means Redis is not connected.
3. Sign out, then sign in at `/login` with the test email and order reference.
4. Open `/api/video` in a private window. It must say "Payment required".
5. Refund the test order, then reload `/watch`. It must send you to the login page.

### 7. Go live

- In `lib/site.js`, remove `.test` from the storefront value and push.
- Delete `ALLOW_TEST_ORDERS` in Vercel and redeploy.

## Good to know

- Vercel's free Hobby plan is for non-commercial use. For a paid product, their terms ask for the Pro plan at $1 a month.
- To reset a buyer who ran out of device slots, open the Upstash data browser and delete the key `devices:THEIR_ORDER_ID`.
- Vercel's free plan includes 1 GB of Blob storage and 10 GB of Blob transfer a month. Your video is 222 MB, so that is about 45 full viewings a month. Past the limit Vercel does not charge you, it blocks the Blob store for 30 days, which means the video stops playing for everyone. Upgrade to Pro before you get close.
- The temporary video link lasts 6 hours. A buyer could pass that link to someone for those hours. Nothing on the web stops screen recording either.
- Buyers type their email at checkout, so the login is only as private as their receipt. For stronger login, add a one-time code by email later. It needs an email service such as Resend and a verified sending domain.
