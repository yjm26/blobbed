import React from 'react';
import PaperShader from './components/PaperShader';

export default function Landing() {
  return (
    <div className="landing-page">
      {/* Navbar - Topology style */}
      <nav className="landing-nav">
        <div className="nav-inner">
          <div className="landing-logo">BLOBBED</div>
          <a href="/pages/drive.html" className="nav-cta">GO TO APP</a>
        </div>
      </nav>

      {/* HERO - 21st.dev Background Paper Shaders (MeshGradient + DotOrbit) */}
      <section className="landing-hero">
        <div className="hero-shader">
          <PaperShader />
        </div>

        <div className="hero-content">
          <h1 className="hero-title">
            <span className="line">Your files.</span>
            <span className="line dim">No one else's.</span>
            <span className="line">Truly yours.</span>
          </h1>
          <p className="hero-desc">
            Decentralized, encrypted file storage on Shelby Protocol.
          </p>
          <div className="hero-cta">
            <a href="/pages/drive.html" className="cta-primary">Enter the App</a>
            <a href="#stance" className="cta-secondary">Learn more</a>
          </div>
        </div>
      </section>

      {/* STANCE */}
      <section className="sticky-section" id="stance">
        <div className="sticky-sidebar">
          <div className="section-label">01.</div>
          <h2 className="sticky-title">The<br />Stance</h2>
        </div>
        <div className="sticky-content">
          <article className="sticky-item">
            <h3>Encrypt First</h3>
            <p>Files are locked with AES-256-GCM in your browser before touching the network. The ciphertext travels. The key does not.</p>
            <blockquote>"The lock and the key should never meet outside your device."</blockquote>
          </article>
          <article className="sticky-item">
            <h3>Own Your Keys</h3>
            <p>No password resets. No account recovery. Your key is embedded in the share link you create. Lose the link, lose the file. That's the trade-off for true control.</p>
            <blockquote>"With great privacy comes great responsibility."</blockquote>
          </article>
          <article className="sticky-item">
            <h3>Outlive the Platform</h3>
            <p>The blob registry lives on Aptos blockchain. The data lives on Shelby storage nodes across the globe. This website is just a window.</p>
            <blockquote>"Build for the network, not the company."</blockquote>
          </article>
        </div>
      </section>

      {/* FLOW */}
      <section className="flow-section alt-bg" id="flow">
        <div className="flow-header">
          <div className="section-label">02.</div>
          <h2 className="flow-title">The Flow</h2>
        </div>
        <div className="flow-items">
          <div className="flow-step">
            <span className="flow-num">01</span>
            <h3>Drop</h3>
            <p>Drag a file. Browser encrypts it instantly with a random 256-bit key you never see.</p>
          </div>
          <div className="flow-connector"></div>
          <div className="flow-step">
            <span className="flow-num">02</span>
            <h3>Store</h3>
            <p>The encrypted blob is registered on-chain and distributed across Shelby nodes. No central server.</p>
          </div>
          <div className="flow-connector"></div>
          <div className="flow-step">
            <span className="flow-num">03</span>
            <h3>Share</h3>
            <p>Copy the link. Blob hash + decryption key in the URL fragment. Send anywhere.</p>
          </div>
        </div>
      </section>

      {/* DETAILS */}
      <section className="details-section" id="details">
        <div className="details-header">
          <div className="section-label">03.</div>
          <h2 className="details-title">Details</h2>
        </div>
        <div className="details-list">
          <details className="faq-block">
            <summary>Can you read my files?</summary>
            <p>No. Encryption happens client-side before upload. We never see the key or the plaintext.</p>
          </details>
          <details className="faq-block">
            <summary>What if this site goes down?</summary>
            <p>Your files live on Shelby Protocol nodes and the Aptos blockchain. Anyone with the link can still retrieve the file.</p>
          </details>
          <details className="faq-block">
            <summary>Why do I need a wallet to upload?</summary>
            <p>Registering a blob requires an on-chain transaction on Aptos. This costs a tiny amount of APT. Downloading is completely free and needs no wallet.</p>
          </details>
          <details className="faq-block">
            <summary>Is there a file size limit?</summary>
            <p>~100MB per file for the MVP. Shelby Protocol supports much larger — limits will increase as the network grows.</p>
          </details>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <h2 className="cta-title">Ready?</h2>
        <a href="/pages/drive.html" className="cta-primary large">Enter the App</a>
      </section>

      <footer className="landing-footer">
        <p>Built on Shelby Protocol</p>
      </footer>
    </div>
  );
}
