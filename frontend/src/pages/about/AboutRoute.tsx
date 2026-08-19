import { AboutPage, AboutSection } from 'react-cheminfo/ui';

import { ABOUT } from '../../about.ts';

/** The five organisations that curate and distribute the archive. */
const PARTNERS = [
  {
    href: 'https://www.rcsb.org/',
    name: 'RCSB PDB',
    what: 'Research Collaboratory for Structural Bioinformatics, USA.',
  },
  {
    href: 'https://www.ebi.ac.uk/pdbe/',
    name: 'PDBe',
    what: 'Protein Data Bank in Europe, EMBL-EBI, UK.',
  },
  {
    href: 'https://pdbj.org/',
    name: 'PDBj',
    what: 'Protein Data Bank Japan, Osaka University.',
  },
  {
    href: 'https://bmrb.io/',
    name: 'BMRB',
    what: 'Biological Magnetic Resonance Data Bank, USA.',
  },
  {
    href: 'https://www.ebi.ac.uk/emdb/',
    name: 'EMDB',
    what: 'Electron Microscopy Data Bank, the cryo-EM maps.',
  },
] as const;

/**
 * About page mounted at `/about`: the family's shared page, plus the one
 * section this site owes its data — who curates the archive and what a paper
 * using an entry has to carry.
 * @returns About page React element.
 */
export default function AboutRoute() {
  return (
    <div className="container">
      <AboutPage content={ABOUT}>
        <AboutSection title="The wwPDB partners" className="about-partners">
          <p style={{ margin: 0 }}>
            Five organisations curate, validate and distribute every entry. Go
            to them for richer search, for validation reports, and for the
            authoritative version of a record.
          </p>
          <ul className="about-partner-list">
            {PARTNERS.map((partner) => (
              <li key={partner.name}>
                <a
                  href={partner.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {partner.name}
                </a>{' '}
                — {partner.what}
              </li>
            ))}
          </ul>
          <p style={{ margin: 0 }}>
            Cite the primary publication of each entry you use as well: it is in
            the entry&apos;s <code>JRNL</code> records. The rest is in the{' '}
            <a
              href="https://www.wwpdb.org/about/usage-policies"
              target="_blank"
              rel="noopener noreferrer"
            >
              wwPDB usage policies
            </a>
            .
          </p>
        </AboutSection>
      </AboutPage>
    </div>
  );
}
