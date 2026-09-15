import { Button, ButtonGroup } from '@blueprintjs/core';
import { useState } from 'react';
import { CopyButton } from 'react-cheminfo/ui';

import EndpointPreview from './EndpointPreview.tsx';
import { endpoints } from './endpoints.tsx';

/**
 * Render the API endpoint reference list with inline copy and test controls.
 * @returns List of endpoint cards.
 */
export default function EndpointList() {
  const [openExample, setOpenExample] = useState<string | null>(null);

  return (
    <div>
      {endpoints.map((endpoint) => {
        const isOpen = openExample === endpoint.example;
        return (
          <div key={endpoint.path} className="endpoint">
            <code className="path">
              {endpoint.method} {endpoint.path}
            </code>
            <p>{endpoint.description}</p>
            {endpoint.legacyAliases && endpoint.legacyAliases.length > 0 && (
              <p className="endpoint-legacy">
                Obsolete{' '}
                {endpoint.legacyAliases.length === 1 ? 'alias' : 'aliases'}{' '}
                (kept for backwards compatibility — prefer the v1 path above):{' '}
                {endpoint.legacyAliases.map((alias, index) => (
                  <span key={alias}>
                    {index > 0 && ', '}
                    <code>
                      {endpoint.method} {alias}
                    </code>
                  </span>
                ))}
              </p>
            )}
            <div className="endpoint-row">
              <a className="example" href={endpoint.example}>
                {endpoint.example}
              </a>
              <ButtonGroup className="endpoint-actions">
                <CopyButton
                  small
                  content={() => toAbsoluteUrl(endpoint.example)}
                  label="Copy"
                  copiedLabel="Copied!"
                />
                <Button
                  size="small"
                  icon={isOpen ? 'chevron-up' : 'play'}
                  onClick={() =>
                    setOpenExample(isOpen ? null : endpoint.example)
                  }
                >
                  {isOpen ? 'Hide' : 'Test'}
                </Button>
              </ButtonGroup>
            </div>
            {isOpen && (
              <div className="endpoint-preview">
                <EndpointPreview
                  key={endpoint.example}
                  url={endpoint.example}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Resolve a relative API path to an absolute URL based on the current origin,
 * so the value placed on the clipboard is directly usable from any tool.
 * @param path - Relative API path.
 * @returns Absolute URL string.
 */
function toAbsoluteUrl(path: string): string {
  if (typeof window === 'undefined') return path;
  return new URL(path, window.location.origin).toString();
}
