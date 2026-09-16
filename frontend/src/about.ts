import { BUILD_INFO } from 'react-cheminfo/build-info';
import type { AboutContent, Reference } from 'react-cheminfo/core';
import { PLATFORM_WORK } from 'react-cheminfo/core';

import { PAPER } from './shared/paper.ts';

/**
 * The reference the wwPDB puts first: the archive as it stands today, and the
 * one a paper citing "the PDB" is expected to carry.
 */
const WWPDB_CONSORTIUM: Reference = {
  authors: [{ given: '', family: 'wwPDB consortium' }],
  title:
    'Protein Data Bank: the single global archive for 3D macromolecular structure data',
  journal: 'Nucleic Acids Research',
  journalAbbreviation: 'Nucleic Acids Res.',
  year: 2019,
  volume: '47',
  issue: 'D1',
  firstPage: 'D520',
  lastPage: 'D528',
  doi: '10.1093/nar/gky949',
  publisher: 'Oxford University Press',
};

/** The paper announcing the archive as an international consortium. */
const WWPDB_ANNOUNCEMENT: Reference = {
  authors: [
    { given: 'H. M.', family: 'Berman' },
    { given: 'K.', family: 'Henrick' },
    { given: 'H.', family: 'Nakamura' },
  ],
  title: 'Announcing the worldwide Protein Data Bank',
  journal: 'Nature Structural Biology',
  journalAbbreviation: 'Nat. Struct. Biol.',
  year: 2003,
  volume: '10',
  issue: '12',
  firstPage: '980',
  lastPage: '980',
  doi: '10.1038/nsb1203-980',
  publisher: 'Nature Publishing Group',
};

/** The viewer every 3D structure on this site is drawn by. */
const MOLSTAR_PAPER: Reference = {
  authors: [
    { given: 'D.', family: 'Sehnal' },
    { given: 'S.', family: 'Bittrich' },
    { given: 'M.', family: 'Deshpande' },
    { given: 'R.', family: 'Svobodová' },
    { given: 'K.', family: 'Berka' },
    { given: 'V.', family: 'Bazgier' },
    { given: 'S.', family: 'Velankar' },
    { given: 'S. K.', family: 'Burley' },
    { given: 'J.', family: 'Koča' },
    { given: 'A. S.', family: 'Rose' },
  ],
  title: 'Mol*: towards a common library and tools for web molecular graphics',
  journal: 'Nucleic Acids Research',
  journalAbbreviation: 'Nucleic Acids Res.',
  year: 2021,
  volume: '49',
  issue: 'W1',
  firstPage: 'W431',
  lastPage: 'W437',
  doi: '10.1093/nar/gkab314',
  publisher: 'Oxford University Press',
};

/** What this site says about itself, at `/about`. */
export const ABOUT: AboutContent = {
  siteId: 'pdb',
  // Which release, built when, from which commit: the build says so,
  // because a version written by hand is wrong by the next release.
  build: BUILD_INFO,
  what: 'A read-only mirror of the worldwide Protein Data Bank, served with a search index, an HTTP API and pre-rendered views.',
  can: [
    'Open any entry by its identifier and read its chains, ligands and assemblies.',
    'Search and filter every entry by title, method, resolution and year.',
    'Browse every chemical component, by structure, by formula or by the entries holding it.',
    'Script a structure in the browser and take the result away.',
    'Read what the archive holds, by method, by resolution and by year.',
    'Fetch any entry, assembly or ligand as JSON over HTTP.',
  ],
  paragraphs: [
    'The data is the wwPDB archive, mirrored daily from rsync.wwpdb.org and redistributed unchanged under the CC0 1.0 public domain dedication. What this site adds is the search index, the HTTP API and the pre-rendered views.',
    'Nothing is computed when a page opens: every entry is parsed once into SQLite and rendered once with PyMOL, then served straight from disk.',
  ],
  credits: [
    'molstar',
    'openchemlib',
    'react-ocl',
    'react-mf',
    'nivo',
    'blueprint',
    'react-science',
    'react-cheminfo',
    'react',
    'vite',
  ],
  cite: [
    PLATFORM_WORK,
    {
      reference: WWPDB_CONSORTIUM,
      what: 'The Protein Data Bank archive',
      note: 'Cite the archive rather than this site: what you read here is the wwPDB data, unchanged.',
    },
    {
      reference: WWPDB_ANNOUNCEMENT,
      what: 'The worldwide consortium that runs it',
      note: 'The second of the three references the wwPDB asks every downstream use to carry.',
    },
    {
      reference: PAPER,
      what: 'The founding Protein Data Bank paper',
      note: 'The third of the three references the wwPDB asks for.',
    },
    {
      reference: MOLSTAR_PAPER,
      what: 'Mol*, the viewer',
      note: 'Cite it as well when a figure or a view made on this site goes into a publication.',
    },
  ],
};
