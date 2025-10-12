import React from 'react';
import type { LinkProps } from 'next/link';

type AnchorProps = React.AnchorHTMLAttributes<HTMLAnchorElement>;

type Props = LinkProps & { children: React.ReactNode } & AnchorProps;

const NextLinkMock = React.forwardRef<HTMLAnchorElement, Props>(function NextLinkMock(
  { href, children, onClick, ...rest },
  ref,
) {
  let resolvedHref = '#';
  if (typeof href === 'string') {
    resolvedHref = href;
  } else if (href && typeof href === 'object') {
    const pathname = (href as { pathname?: string }).pathname;
    resolvedHref = pathname ?? '#';
  }
  return (
    <a href={resolvedHref} onClick={onClick} ref={ref} {...rest}>
      {children}
    </a>
  );
});

export default NextLinkMock;
