import { Link } from 'react-router-dom';

export default function CourseCard({ delay = 0, banner, bannerLabel, name, nameIcon, tags, desc, fillWidth, ctaLink, ctaLabel }) {
    return (
        <div className="lp-course-card lp-reveal" style={{ transitionDelay: `${delay}ms` }}>
            <div className="lp-course-banner" style={{ background: banner }}>
                <span className="lp-course-banner-label">{bannerLabel}</span>
            </div>
            <div className="lp-course-body">
                <div className="lp-course-info">
                    <h3
                        className="lp-course-name"
                        style={nameIcon ? { display: 'flex', alignItems: 'center', gap: '8px' } : {}}
                    >
                        {nameIcon && nameIcon}
                        {name}
                    </h3>
                    <p className="lp-course-desc">{desc}</p>
                    <div className="lp-course-progress-bar">
                        <div className="lp-course-progress-fill" style={{ '--fill-width': fillWidth }}></div>
                    </div>
                </div>
                <Link
                    to={ctaLink}
                    className="lp-btn lp-btn--primary"
                    style={{ flexShrink: 0, height: '40px', fontSize: '13px', padding: '0 36px' }}
                >
                    {ctaLabel}
                </Link>
            </div>
        </div>
    );
}
