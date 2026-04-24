export function PageHeader({ title, description, actions, descriptionClassName = '' }) {
  return (
    <div className="page-header">
      <div>
        <p className="eyebrow">원가/관리회계</p>
        <h2>{title}</h2>
        <p className={`page-description ${descriptionClassName}`.trim()}>{description}</p>
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  )
}
