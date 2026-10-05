export function SectionHeading({ eyebrow, title, description, action, align = 'left' }) {
  return (
    <div className={`flex flex-col gap-5 ${align === 'center' ? 'items-center text-center' : 'items-start'} sm:flex-row sm:items-end sm:justify-between`}>
      <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2 className="section-title mt-4 text-ink">{title}</h2>
        {description && <p className="body-copy mt-4">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
