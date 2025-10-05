import React from 'react';
import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

const resolveImageSrc = (input: unknown): string => {
  if (typeof input === 'string') {
    return input;
  }
  if (input && typeof input === 'object' && 'src' in input) {
    const candidate = (input as { src?: unknown }).src;
    return typeof candidate === 'string' ? candidate : '';
  }
  return '';
};

vi.mock('next/image', () => ({
  __esModule: true,
  default: React.forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>(
    ({ src, alt, ...props }, ref) =>
      React.createElement('img', {
        ref,
        alt,
        src: resolveImageSrc(src),
        ...props
      })
  )
}));
