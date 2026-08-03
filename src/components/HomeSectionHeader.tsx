import Link from "next/link";

type HomeSectionHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  titleId?: string;
};

export function HomeSectionHeader({
  eyebrow,
  title,
  description,
  actionLabel,
  actionHref,
  titleId
}: HomeSectionHeaderProps) {
  return (
    <header className="home-section-header">
      <div className="home-section-header-copy">
        <p className="home-section-eyebrow">{eyebrow}</p>
        <h2 className="home-section-title" id={titleId}>
          {title}
        </h2>
        {description ? <p className="home-section-desc">{description}</p> : null}
      </div>
      {actionLabel && actionHref ? (
        <Link className="home-section-more" href={actionHref}>
          {actionLabel}
        </Link>
      ) : null}
    </header>
  );
}
