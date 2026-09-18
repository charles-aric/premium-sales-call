import { readAccess, orderStillPaid } from "../../lib/shared.js";
import manifest from "../../lib/video-manifest.js";

// Streams the video only to browsers that hold a valid cookie for a paid order.
// Two storage options, picked automatically:
//   1. An R2 bucket bound as VIDEO_BUCKET, if you set one up.
//   2. Otherwise the split parts in /public/vparts, described by lib/video-manifest.js.
// Both support Range requests, so seeking works, including on Safari and iPhone.
export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }
  const orderId = await readAccess(request, env);
  if (!orderId || !(await orderStillPaid(orderId, env))) {
    return new Response("Payment required", { status: 402 });
  }
  if (env.VIDEO_BUCKET) return fromR2(request, env);
  if (manifest) return fromParts(request, env, context);
  return new Response("Video not uploaded yet", { status: 404 });
}

function baseHeaders(type) {
  return new Headers({
    "content-type": type || "video/mp4",
    "accept-ranges": "bytes",
    "cache-control": "private, no-store",
  });
}

/* ---------- option 2: parts stored as static files ---------- */

async function fromParts(request, env, context) {
  const { size, chunkSize, token } = manifest;
  const headers = baseHeaders(manifest.type);
  const rangeHeader = request.headers.get("range");

  let start = 0, end = size - 1, status = 200;
  if (rangeHeader) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
    if (!m || (m[1] === "" && m[2] === "")) return unsatisfiable(size);
    if (m[1] === "") {
      start = Math.max(0, size - Number(m[2]));
    } else {
      start = Number(m[1]);
      if (m[2] !== "") {
        end = Math.min(Number(m[2]), size - 1);
      } else {
        // Open-ended request. Answer up to the end of the current part and let the
        // browser ask for the next stretch. Keeps each response to one file read.
        end = Math.min((Math.floor(start / chunkSize) + 1) * chunkSize - 1, size - 1);
      }
    }
    if (start > end || start >= size) return unsatisfiable(size);
    status = 206;
    headers.set("content-range", `bytes ${start}-${end}/${size}`);
  }

  const length = end - start + 1;
  headers.set("content-length", String(length));
  if (request.method === "HEAD") return new Response(null, { status, headers });

  const { readable, writable } = new FixedLengthStream(length);
  const pump = (async () => {
    const writer = writable.getWriter();
    try {
      const first = Math.floor(start / chunkSize);
      const last = Math.floor(end / chunkSize);
      for (let i = first; i <= last; i++) {
        const partStart = i * chunkSize;
        const from = Math.max(start, partStart) - partStart;
        const to = Math.min(end, partStart + chunkSize - 1) - partStart;
        const name = `${token}-${String(i).padStart(3, "0")}.bin`;
        const res = await env.ASSETS.fetch(new URL(`/vparts/${name}`, request.url), {
          headers: { range: `bytes=${from}-${to}` },
        });
        if (!res.ok || !res.body) throw new Error(`Missing video part ${name}`);
        await copySlice(res, writer, res.status === 206 ? 0 : from, to - from + 1);
      }
      await writer.close();
    } catch (err) {
      await writer.abort(err).catch(() => {});
    }
  })();
  context.waitUntil(pump);

  return new Response(readable, { status, headers });
}

// Copies `count` bytes from the response body to the writer, after skipping `skip` bytes.
async function copySlice(res, writer, skip, count) {
  const reader = res.body.getReader();
  let remaining = count;
  while (remaining > 0) {
    const { value, done } = await reader.read();
    if (done) break;
    let piece = value;
    if (skip > 0) {
      if (piece.length <= skip) { skip -= piece.length; continue; }
      piece = piece.subarray(skip);
      skip = 0;
    }
    if (piece.length > remaining) piece = piece.subarray(0, remaining);
    await writer.write(piece);
    remaining -= piece.length;
  }
  await reader.cancel().catch(() => {});
}

function unsatisfiable(size) {
  return new Response("Range not satisfiable", { status: 416, headers: { "content-range": `bytes */${size}` } });
}

/* ---------- option 1: R2 bucket ---------- */

async function fromR2(request, env) {
  const key = env.VIDEO_KEY || "video.mp4";
  const rangeHeader = request.headers.get("range");
  let obj;
  try {
    obj = await env.VIDEO_BUCKET.get(key, rangeHeader ? { range: request.headers } : undefined);
  } catch {
    return new Response("Range not satisfiable", { status: 416 });
  }
  if (!obj) return new Response("Video not found in bucket", { status: 404 });

  const headers = baseHeaders();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);

  let status = 200, length = obj.size;
  if (rangeHeader && obj.range) {
    let offset, len;
    if ("suffix" in obj.range) {
      len = Math.min(obj.range.suffix, obj.size);
      offset = obj.size - len;
    } else {
      offset = obj.range.offset || 0;
      len = obj.range.length != null ? obj.range.length : obj.size - offset;
    }
    headers.set("content-range", `bytes ${offset}-${offset + len - 1}/${obj.size}`);
    status = 206;
    length = len;
  }
  headers.set("content-length", String(length));
  return new Response(request.method === "HEAD" ? null : obj.body, { status, headers });
}
