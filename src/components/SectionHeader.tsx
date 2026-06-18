type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actionLabel?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  actionLabel
}: SectionHeaderProps) {
  return (
    <div className="section-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {description ? <p className="section-description">{description}</p> : null}
      </div>
      {actionLabel ? (
        <a className="text-link" href="#">
          {actionLabel}
        </a>
      ) : null}
    </div>
  );
}
