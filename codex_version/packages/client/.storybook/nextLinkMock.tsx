import { forwardRef } from 'react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
};

const NextLink = forwardRef<HTMLAnchorElement, LinkProps>(({ href, children, ...rest }, ref) => (
  <a ref={ref} href={href} {...rest}>
    {children}
  </a>
));

NextLink.displayName = 'NextLinkMock';

export default NextLink;
