import { Link } from 'react-router-dom';
import ChapterSection from './ChapterSection';

const proofCells = [
  ['Before network', 'AES-256-GCM'],
  ['Storage layer', 'Shelby blobs'],
  ['Access model', 'Fragment keys'],
];

const principles = [
  {
    label: '01 / Client',
    title: 'Encrypt first',
    text: 'The browser generates the file key and encrypts bytes before upload. Shelby receives ciphertext only.',
    className: 'landing-cell landing-cell-wide',
  },
  {
    label: '02 / Vault',
    title: 'Wrap keys',
    text: 'Library metadata can sync while raw DEKs stay wrapped by the wallet-derived vault key.',
    className: 'landing-cell landing-cell-mid landing-cell-accent',
  },
  {
    label: '03 / Share',
    title: 'Live capability folders',
    text: 'Folder links use a folder key in the URL fragment. New files appear without regenerating the link.',
    className: 'landing-cell landing-cell-tall',
  },
  {
    label: '04 / Recover',
    title: 'Readable states',
    text: 'Errors, empty folders, and revoked shares explain what happened without exposing secrets.',
    className: 'landing-cell landing-cell-mid',
  },
];

const flowSteps = [
  {
    number: '01',
    title: 'Drop',
    text: 'Generate a random file key, encrypt locally, and prepare a preview without uploading plaintext.',
  },
  {
    number: '02',
    title: 'Store',
    text: 'Upload encrypted bytes to Shelby through the app gateway. Save only wrapped metadata.',
  },
  {
    number: '03',
    title: 'Share',
    text: 'Issue a capability link for a file or a live folder. Recipients decrypt in the browser.',
  },
];

const faqItems = [
  {
    question: 'Can Aegis read my files?',
    answer:
      'No. Stored files are encrypted before upload. Public live folder APIs return encrypted key wraps, not raw keys.',
    open: true,
  },
  {
    question: 'What makes folder shares live?',
    answer:
      'A folder key wraps every file key in that folder. The link stays stable while the public index changes.',
  },
  {
    question: 'What happens if I revoke a link?',
    answer:
      'The public share row returns gone, so the link can no longer resolve the current folder index.',
  },
];

export default function LandingSections() {
  return (
    <main className="landing-after-hero">
      <ChapterSection
        index="01"
        label="Why it exists"
        title="Private storage should feel like a product, not a warning label."
        description="Aegis encrypts in the browser first, stores ciphertext on Shelby, and keeps sharing as a capability. The interface explains the model without turning privacy into homework."
      >
        <div className="landing-mini-ledger">
          {proofCells.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </ChapterSection>

      <ChapterSection
        index="02"
        label="Principles"
        id="principles"
        title="Every object has a boundary."
        description="Files, metadata, folders, and shares are treated as separate surfaces. Each card maps to a real security boundary."
      >
        <div className="landing-cell-grid">
          {principles.map((principle) => (
            <article className={principle.className} key={principle.label}>
              <span className="landing-cell-number">{principle.label}</span>
              <div>
                <h3>{principle.title}</h3>
                <p>{principle.text}</p>
              </div>
            </article>
          ))}
          <article className="landing-cell landing-cell-full">
            <span className="landing-cell-number">System rule</span>
            <div>
              <h3>No plaintext crosses the API for storage.</h3>
              <p>
                Public share APIs return only storage coordinates and encrypted key wraps. The browser owns decrypt.
              </p>
            </div>
          </article>
        </div>
      </ChapterSection>

      <ChapterSection index="03" label="Flow" id="flow" title="Drop, store, share. Each step is visible.">
        <div className="landing-process-board">
          {flowSteps.map((step) => (
            <article className="landing-process-card" key={step.number}>
              <span className="num">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </ChapterSection>

      <section className="landing-chapter" id="details">
        <div className="landing-faq-wrap">
          <aside className="landing-privacy-panel">
            <div>
              <span className="landing-cell-number">04 / Details</span>
              <h2>Privacy model, in plain terms.</h2>
            </div>
            <p>
              The API can coordinate pointers and wrapped keys. It does not receive the key needed to read your files.
            </p>
          </aside>
          <div className="landing-faq-list">
            {faqItems.map((item) => (
              <details className="landing-faq-row" open={item.open} key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-close-panel">
        <h2>
          Your files.
          <br />
          Encrypted first.
        </h2>
        <Link to="/gate">Enter the App</Link>
      </section>
    </main>
  );
}
