"use client";

import { useRef } from "react";
import { SITE } from "@/lib/site";
import { clock } from "@/lib/format";
import { track } from "@/lib/analytics";

const MILESTONES = [25, 50, 75, 100];

export default function WatchPlayer() {
  const video = useRef(null);
  const started = useRef(false);
  const reached = useRef(new Set());

  function onPlay() {
    if (started.current) return;
    started.current = true;
    track("video_start");
  }

  function onTimeUpdate(e) {
    const { currentTime, duration } = e.currentTarget;
    if (!duration || !isFinite(duration)) return;
    const pct = (currentTime / duration) * 100;
    for (const m of MILESTONES) {
      // Allow 100 to fire a little before the exact end, since timeupdate rarely lands on it.
      const hit = m === 100 ? pct >= 99 : pct >= m;
      if (hit && !reached.current.has(m)) {
        reached.current.add(m);
        track("video_progress", { percent: m });
      }
    }
  }

  function jump(minute) {
    if (!video.current) return;
    video.current.currentTime = minute * 60;
    video.current.play();
    video.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <>
      <div className="player">
        <video
          ref={video}
          src="/api/video"
          controls
          playsInline
          preload="metadata"
          controlsList="nodownload"
          onContextMenu={(e) => e.preventDefault()}
          onPlay={onPlay}
          onTimeUpdate={onTimeUpdate}
          onEnded={() => track("video_complete")}
        />
      </div>
      {/* <section className="lower" style={{ borderTop: 0, paddingTop: 48 }}>
        <div>
          <h2>Jump to a part</h2>
          <ol className="chapters">
            {SITE.chapters.map((c) => (
              <li key={c.at}>
                <button type="button" onClick={() => jump(c.at)}>
                  <time>{clock(c.at * 60)}</time><span>{c.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </section> */}
    </>
  );
}
