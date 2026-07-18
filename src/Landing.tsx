import React from 'react';
import { Link } from 'react-router-dom';
import PaperShader from './components/PaperShader';

export default function Landing() {
  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="nav-inner">
          <div className="landing-logo">BLOBBED</div>
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

      <section className="band intro-band">
        <p className="eyebrow">Why it exists</p>
        <p className="lede">
          Most “cloud storage” is someone else’s disk with a password on top.
          Blobbed encrypts in the browser first. Ciphertext goes to Shelby nodes.
          File keys are wrapped with a key derived from your wallet signature
          before library meta hits the server. Share links keep the raw key in the
          URL fragment, never as a query string to our API.
        </p>
      </section>

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
              Shelby only ever sees ciphertext.
            </p>
            <blockquote>Plaintext never leaves the tab for storage.</blockquote>
            <figcaption>Client-side · AES-256-GCM</figcaption>
          </figure>

          <figure className="principle">
            <h3>Wrap keys</h3>
            <p>
              Each file DEK is wrapped with a vault key from your wallet{' '}
              <code>signMessage</code>. Neon may hold names and wrapped blobs . 
              not raw DEKs after unlock+migrate.
            </p>
            <blockquote>Library sync without raw keys at rest.</blockquote>
            <figcaption>Wallet-derived vault · bw1 wrap</figcaption>
          </figure>

          <figure className="principle">
            <h3>Capability shares</h3>
            <p>
              Share links put account + blob + key in the URL fragment. Lose the
              link, lose access. No server “shared with you” inbox by default.
            </p>
            <blockquote>With real privacy comes real responsibility.</blockquote>
            <figcaption>MEGA-style fragment keys</figcaption>
          </figure>
        </div>
      </section>

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
                Browser generates a random 256-bit key, encrypts the file, and
                optionally chunks large/video payloads.
              </p>
            </div>
          </li>
          <li className="process-row">
            <span className="process-num">02</span>
            <div className="process-body">
              <h3>Store</h3>
              <p>
                Ciphertext is uploaded via a service wallet on shelbynet (MVP
                relay). Your wallet is identity. you sign to wrap keys, not to
                pay gas yet.
              </p>
            </div>
          </li>
          <li className="process-row">
            <span className="process-num">03</span>
            <div className="process-body">
              <h3>Share</h3>
              <p>
                Copy the link. Raw DEK sits in <code>#fragment</code> only.
                Anyone with the link can decrypt in-browser. No wallet to read.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section className="band" id="details">
        <header className="band-head">
          <span className="idx">03</span>
          <h2 className="band-title">Details</h2>
        </header>
<div className="faq-list" style={{ marginTop: '1.5rem' }}>
          <details className="faq-row">
            <summary>Can you read my files?</summary>
            <p>
              We never receive plaintext. After wallet wrap, we also should not
              hold raw DEKs. only wrapped key material plus names/pointers.
              Share links are a different path: whoever has the link can decrypt
              that object. Thumbs you generate are small client-side previews
              stored as data URLs in meta.
            </p>
          </details>
          <details className="faq-row">
            <summary>What if this site goes down?</summary>
            <p>
              Ciphertext stays on Shelby. Share links still work from any client
              that speaks the same fragment format. Your library index needs the
              meta store (Neon) or a local export. not only the marketing site.
            </p>
          </details>
          <details className="faq-row">
            <summary>Why a wallet?</summary>
            <p>
              Identity for your library, and a signature to derive the vault key
              that wraps file keys. Download/share open stays free and anonymous.
              Upload gas is sponsored by a service wallet on testnet/shelbynet for
              now.
            </p>
          </details>
          <details className="faq-row">
            <summary>File size limit?</summary>
            <p>
              Encrypted payload capped by the upload API (default ~10MB JSON
              body). Chunked container format is ready; limits rise with the
              gateway.
            </p>
          </details>
        </div>
      </section>

      <section className="band close-band">
        <h2 className="close-title">
          Your files.
          <br />
          Encrypted first.
        </h2>
        <Link to="/gate" className="cta-primary">
          Enter the App
        </Link>
      </section>

      <footer className="landing-footer">
        <span>Built on Shelby Protocol · not a security audit</span>
      </footer>
    </div>
  );
}
