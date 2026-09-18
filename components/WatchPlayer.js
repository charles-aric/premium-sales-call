"use client";

import { useRef } from "react";
import { SITE } from "@/lib/site";
import { clock } from "@/lib/format";

export default function WatchPlayer() {
  const video = useRef(null);

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
        />
      </div>
      <section className="lower" style={{ borderTop: 0, paddingTop: 48 }}>
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
      </section>
    </>
  );
}
