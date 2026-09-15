import { useMemo } from 'react';
import { CopyButton } from 'react-cheminfo/ui';

import { highlightCode } from './highlight.ts';

/**
 * A syntax-coloured code sample with a copy button. Every example in the help
 * is meant to be pasted into the editor and run, so copying is the primary
 * action rather than an afterthought.
 */

interface CodeBlockProps {
  /** The code to display. */
  children: string;
}

/**
 * Render a copyable code sample.
 * @param props - Component props.
 * @param props.children - The code to display.
 * @returns Code block element.
 */
export default function CodeBlock({ children }: CodeBlockProps) {
  const tokens = useMemo(() => highlightCode(children), [children]);

  return (
    <div className="help-code">
      <pre>
        {tokens.map((token, index) => (
          // Tokens are positional and the list is static per sample, so the
          // index is a stable key here.
          // eslint-disable-next-line react/no-array-index-key -- positional tokens
          <span key={index} className={`tok-${token.kind}`}>
            {token.value}
          </span>
        ))}
      </pre>
      <CopyButton
        className="help-code-copy"
        content={children}
        label="Copy"
        minimal
        small
      />
    </div>
  );
}
