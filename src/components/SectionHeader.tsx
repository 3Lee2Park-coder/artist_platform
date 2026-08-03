type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  actionLabel,
  actionHref = "#"
}: SectionHeaderProps) {
  return (
    <div className="section-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {description ? <p className="section-description">{description}</p> : null}
      </div>
      {actionLabel ? (
        <a className="text-link" href={actionHref}>
          {actionLabel}
        </a>
      ) : null}
    </div>
  );
}