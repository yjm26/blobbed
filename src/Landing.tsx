import { Link } from 'react-router-dom';
import LandingSections from './components/landing/LandingSections';
import PaperShader from './components/shared/PaperShader';

export default function Landing() {
  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="nav-inner">
          <div className="landing-logo">AEGIS</div>
          <Link to="/gate" className="nav-cta">
            GO TO APP
          </Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="hero-shader">
          <PaperShader />
        </div>
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="line">Your files.</span>
            <span className="line dim">Encrypted first.</span>
            <span className="line">On Shelby.</span>
          </h1>
          <p className="hero-desc">
            Client-side AES drive on Shelby Protocol. Ciphertext on the network;
            keys wrapped by your wallet.
          </p>
          <div className="hero-cta">
            <Link to="/gate" className="cta-primary">
              Enter the App
            </Link>
            <a href="#principles" className="cta-secondary">
              Read more
            </a>
          </div>
        </div>
      </section>

      <LandingSections />

      <footer className="landing-footer">
        <span>Built on Shelby Protocol · not a security audit</span>
      </footer>
    </div>
  );
}
