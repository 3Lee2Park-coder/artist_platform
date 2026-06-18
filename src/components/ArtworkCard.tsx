import type { Artwork } from "@/types/exhibition";

type ArtworkCardProps = {
  artwork: Artwork;
};

export function ArtworkCard({ artwork }: ArtworkCardProps) {
  return (
    <article className="artwork-card">
      <div
        className="artwork-image"
        style={{ background: artwork.imageTone }}
        aria-hidden="true"
      />
      <div>
        <h3>{artwork.title}</h3>
        <p>{artwork.artist}</p>
        <span>{artwork.material}</span>
      </div>
    </article>
  );
}