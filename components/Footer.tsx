
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-column">
          <h2>TOYLAND</h2>
          <p>
            Світ іграшок, радості та дитячих мрій.
          </p>
        </div>

        <div className="footer-column">
          <h3>Контакти</h3>
          <a href="tel:+380961270012">
            +380 96 127 00 12
          </a>
          <a href="mailto:toyland@gmail.com">
            toyland@gmail.com
          </a>
        </div>

        <div className="footer-column">
          <h3>Ми в соцмережах</h3>
          <a
            target="_blank"
            rel="noopener noreferrer"
          >
            Instagram
          </a>
          <a
            target="_blank"
            rel="noopener noreferrer"
          >
            Telegram
          </a>
        </div>
      </div>
    </footer>
  );
}
