import React from 'react';
import PaperShader from './components/PaperShader';

export default function Landing() {
  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="nav-inner">
          <div className="landing-logo">BLOBBED</div>
          <a href="/pages/gate.html" className="nav-cta">GO TO APP</a>
        </div>
      </nav>

      {/* HERO */}
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
            <a href="/pages/gate.html" className="cta-primary">Enter the App</a>
            <a href="#principles" className="cta-secondary">Read more</a>
          </div>
        </div>
      </section>

      {/* INTRO — editorial lede */}
      <section className="band intro-band">
        <p className="eyebrow">Why it exists</p>
        <p className="lede">
          Most “cloud storage” is someone else’s computer with a password on top.
          Blobbed encrypts in the browser first. Ciphertext goes to Shelby nodes;
          the key never leaves your device unless you put it in a share link.
          The site is a window — not the vault.
        </p>
      </section>

      {/* PRINCIPLES — Topology-style figures */}
      <section className="band" id="principles">
        <header className="band-head">
          <span className="idx">01</span>
          <h2 className="band-title">Principles</h2>
        </header>

        <div className="principle-grid">
          <figure className="principle">
            <h3>Encrypt first</h3>
            <p>
              AES-256-GCM runs in the browser before anything hits the network.
              Ciphertext travels. The key does not.
            </p>
            <blockquote>
              The lock and the key should never meet outside your device.
            </blockquote>
            <figcaption>Client-side · AES-256-GCM</figcaption>
          </figure>

          <figure className="principle">
            <h3>Own your keys</h3>
            <p>
              No password resets. No recovery email. The key lives in the share
              link you create. Lose the link, lose the file. That’s the trade.
            </p>
            <blockquote>
              With real privacy comes real responsibility.
            </blockquote>
            <figcaption>MEGA-style fragment keys</figcaption>
          </figure>

          <figure className="principle">
            <h3>Outlive the site</h3>
            <p>
              Blob metadata sits on Aptos. Bytes live on Shelby storage nodes.
              This frontend can go dark — the data and the link still work.
            </p>
            <blockquote>
              Build for the network, not the company.
            </blockquote>
            <figcaption>Aptos · Shelby Protocol</figcaption>
          </figure>
        </div>
      </section>

      {/* PROCESS — numbered list, not cards */}
      <section className="band" id="flow">
        <header className="band-head">
          <span className="idx">02</span>
          <h2 className="band-title">How it works</h2>
        </header>

        <ol className="process-list">
          <li className="process-row">
            <span className="process-num">01</span>
            <div className="process-body">
              <h3>Drop</h3>
              <p>
                Choose a file. The browser generates a random 256-bit key and
                encrypts the payload in place. You never see the key — it’s
                bound to the share fragment later.
              </p>
            </div>
          </li>
          <li className="process-row">
            <span className="process-num">02</span>
            <div className="process-body">
              <h3>Store</h3>
              <p>
                The encrypted blob is registered on-chain and distributed across
                Shelby nodes. No central disk. Upload needs a wallet; a tiny
                Aptos fee covers the registration.
              </p>
            </div>
          </li>
          <li className="process-row">
            <span className="process-num">03</span>
            <div className="process-body">
              <h3>Share</h3>
              <p>
                Copy the link. Hash plus decryption key sit in the URL fragment
                — never sent to our servers. Anyone with the link can download.
                No wallet required to read.
              </p>
            </div>
          </li>
        </ol>
      </section>

      {/* DETAILS — hairline FAQ */}
      <section className="band" id="details">
        <header className="band-head">
          <span className="idx">03</span>
          <h2 className="band-title">Details</h2>
        </header>

        <div className="faq-list">
          <details className="faq-row">
            <summary>Can you read my files?</summary>
            <p>
              No. Encryption is client-side before upload. We never receive the
              key or the plaintext.
            </p>
          </details>
          <details className="faq-row">
            <summary>What if this site goes down?</summary>
            <p>
              Files live on Shelby nodes and Aptos. Anyone with the original
              link can still fetch and decrypt — no dependency on this UI.
            </p>
          </details>
          <details className="faq-row">
            <summary>Why a wallet to upload?</summary>
            <p>
              Registering a blob is an on-chain transaction. It costs a small
              amount of APT. Download stays free and anonymous.
            </p>
          </details>
          <details className="faq-row">
            <summary>File size limit?</summary>
            <p>
              Around 100MB per file on the MVP. Shelby supports larger payloads;
              limits rise as the network grows.
            </p>
          </details>
        </div>
      </section>

      {/* CLOSE */}
      <section className="band close-band">
        <h2 className="close-title">
          Your files.
          <br />
          Truly yours.
        </h2>
        <a href="/pages/gate.html" className="cta-primary">Enter the App</a>
      </section>

      <footer className="landing-footer">
        <span>Built on Shelby Protocol</span>
      </footer>
    </div>
  );
}
