import type { Exhibition } from "@/types/exhibition";
import { SectionHeader } from "./SectionHeader";

type VideoSpotlightProps = {
  exhibitions: Exhibition[];
};

export function VideoSpotlight({ exhibitions }: VideoSpotlightProps) {
  const [featured, ...rest] = exhibitions;

  if (!featured?.artistVideo) {
    return null;
  }

  return (
    <section className="content-section video-section">
      <SectionHeader
        eyebrow="Artist video"
        title="영상으로 만나는 전시"
        description="작가가 업로드한 1분 내외의 전시 영상을 통해 공간과 작품 분위기를 먼저 확인해보세요."
        actionLabel="영상 더보기"
      />

      <div className="video-layout">
        <article className="video-feature-card">
          <div
            className="video-poster"
            style={{ background: featured.artistVideo.posterTone }}
            aria-label={`${featured.artistVideo.title} 영상 포스터`}
          >
            <span className="play-button">Play</span>
            <span className="video-duration">{featured.artistVideo.duration}</span>
          </div>
          <div>
            <p className="eyebrow">{featured.district}</p>
            <h3>{featured.artistVideo.title}</h3>
            <p>
              {featured.title} · {featured.artist}
            </p>
          </div>
        </article>

        <div className="video-side-list">
          {rest.map((exhibition) =>
            exhibition.artistVideo ? (
              <article key={exhibition.id} className="video-list-card">
                <div
                  className="video-thumb"
                  style={{ background: exhibition.artistVideo.posterTone }}
                  aria-hidden="true"
                />
                <div>
                  <h3>{exhibition.artistVideo.title}</h3>
                  <p>
                    {exhibition.title} · {exhibition.artist}
                  </p>
                </div>
              </article>
            ) : null
          )}
        </div>
      </div>
    </section>
  );
}
