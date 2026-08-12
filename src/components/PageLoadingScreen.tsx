type PageLoadingScreenProps = {
  label?: string;
};

export function PageLoadingScreen({
  label = "동네 전시를 불러오는 중"
}: PageLoadingScreenProps) {
  return (
    <div className="page-loading" role="status" aria-live="polite">
      <div className="page-loading-inner">
        <span className="page-loading-mark" aria-hidden="true" />
        <p className="page-loading-brand brand-wordmark">OOOF.</p>
        <p className="page-loading-label">{label}</p>
        <div className="page-loading-track" aria-hidden="true">
          <span className="page-loading-fill" />
        </div>
      </div>
    </div>
  );
}
