import type { Artwork } from "@/types/exhibition";
import Link from "next/link";

type ArtworkCardProps = {
  artwork: Artwork;
  linkToExhibition?: boolean;
};

export function ArtworkCard({ artwork, linkToExhibition = false }: ArtworkCardProps) {
  const content = (
    <>
      <div
        className="artwork-image"
        style={
          artwork.imageUrl
            ? {
                backgroundImage: `url(${artwork.imageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center"
              }
            : { background: artwork.imageTone }
        }
        aria-hidden="true"
      />
      <div>
        <h3>{artwork.title}</h3>
        <p>{artwork.artist}</p>
        <span>{artwork.material}</span>
      </div>
    </>
  );

  if (linkToExhibition) {
    return (
      <Link
        className="artwork-card artwork-card-link"
        href={`/exhibitions/${artwork.exhibitionId}`}
        aria-label={`${artwork.title} - ${artwork.artist} 전시 상세로 이동`}
      >
        {content}
      </Link>
    );
  }

  return <article className="artwork-card">{content}</article>;
}
