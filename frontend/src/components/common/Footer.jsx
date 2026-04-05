import { useTranslation } from 'react-i18next';
import './Footer.css';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-col">
          <h4>{t('footer.title')}</h4>
          <p>{t('footer.description')}</p>
        </div>
        <div className="footer-col">
          <h4>{t('footer.explore')}</h4>
          <ul>
            <li><a href="/">{t('footer.allEvents')}</a></li>
            <li><a href="/?tag=Music">{t('footer.music')}</a></li>
            <li><a href="/?tag=Sports">{t('footer.sports')}</a></li>
            <li><a href="/?tag=Workshop">{t('footer.workshop')}</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>{t('footer.support')}</h4>
          <ul>
            <li><a href="#">{t('footer.faq')}</a></li>
            <li><a href="#">{t('footer.refundPolicy')}</a></li>
            <li><a href="#">{t('footer.termsOfUse')}</a></li>
            <li><a href="#">{t('footer.contactUs')}</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>{t('footer.connect')}</h4>
          <div className="footer-socials">
            <a href="#" title={t('footer.facebook')}>📘</a>
            <a href="#" title={t('footer.instagram')}>📸</a>
            <a href="#" title={t('footer.tiktok')}>🎵</a>
            <a href="#" title={t('footer.email')}>📧</a>
          </div>
          <p className="footer-hours">{t('footer.hours')}</p>
        </div>
      </div>
      <div className="footer-bottom">
        <p>{t('footer.rights')}</p>
      </div>
    </footer>
  );
}
