"use client";

import type { Exhibition } from "@/types/exhibition";
import Link from "next/link";
import { useState } from "react";
import { SectionHeader } from "./SectionHeader";

type VideoSpotlightProps = {
  exhibitions: Exhibition[];
};

export function VideoSpotlight({ exhibitions }: VideoSpotlightProps) {
  const videoExhibitions = exhibitions.filter((item) => item.artistVideo?.videoUrl);
  const [featured] = videoExhibitions;
  const [playingId, setPlayingId] = useState<string | null>(null);

  if (!featured?.artistVideo?.videoUrl) {
    return null;
  }

  const activeVideo =
    videoExhibitions.find((item) => item.id === playingId) ?? featured;
  const sideVideos = videoExhibitions.filter((item) => item.id !== activeVideo.id);

  return (
    <section className="content-section video-section">
      <SectionHeader
        eyebrow="Artist video"
        title="영상으로 만나는 전시"
        description="작가가 업로드한 1분 내외의 전시 영상을 통해 공간과 작품 분위기를 먼저 확인해보세요."
      />

      <div className="video-layout">
        <article className="video-feature-card">
          <div
            className="video-poster"
            style={
              activeVideo.heroImageUrl
                ? {
                    backgroundImage: `url(${activeVideo.heroImageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center"
                  }
                : { background: activeVideo.artistVideo!.posterTone }
            }
            aria-label={`${activeVideo.artistVideo!.title} 영상`}
          >
            {playingId === activeVideo.id ? (
              <video
                className="video-player-inline"
                src={activeVideo.artistVideo!.videoUrl}
                controls
                autoPlay
                playsInline
              />
            ) : (
              <button
                type="button"
                className="play-button"
                onClick={() => setPlayingId(activeVideo.id)}
                aria-label={`${activeVideo.artistVideo!.title} 재생`}
              >
                Play
              </button>
            )}
            <span className="video-duration">{activeVideo.artistVideo!.duration}</span>
          </div>
          <div>
            <p className="eyebrow">
              {activeVideo.region} {activeVideo.district}
            </p>
            <h3>{activeVideo.artistVideo!.title}</h3>
            <p>
              {activeVideo.title} · {activeVideo.artist}
            </p>
            <Link className="text-link" href={`/exhibitions/${activeVideo.id}`}>
              전시 상세보기
            </Link>
          </div>
        </article>

        <div className="video-side-list">
          {sideVideos.map((exhibition) =>
            exhibition.artistVideo?.videoUrl ? (
              <button
                key={exhibition.id}
                type="button"
                className={
                  playingId === exhibition.id ? "video-list-card active" : "video-list-card"
                }
                onClick={() => setPlayingId(exhibition.id)}
              >
                <div
                  className="video-thumb"
                  style={
                    exhibition.heroImageUrl
                      ? {
                          backgroundImage: `url(${exhibition.heroImageUrl})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center"
                        }
                      : { background: exhibition.artistVideo.posterTone }
                  }
                  aria-hidden="true"
                />
                <div>
                  <h3>{exhibition.artistVideo.title}</h3>
                  <p>
                    {exhibition.title} · {exhibition.artist}
                  </p>
                </div>
              </button>
            ) : null
          )}
        </div>
      </div>
    </section>
  );
}
