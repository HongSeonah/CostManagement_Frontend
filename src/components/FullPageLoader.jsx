export function FullPageLoader({ title, subtitle }) {
  return (
    <div className="fullpage-loader">
      <div className="loader-card">
        <div className="loader-ring" />
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  )
}
