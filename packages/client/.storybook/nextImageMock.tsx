import React from 'react';

type Props = Omit<React.ComponentProps<'img'>, 'src'> & {
  src: string | { src: string };
};

const resolveSrc = (input: Props['src']): string => {
  if (typeof input === 'string') {
    return input;
  }
  return input.src;
};

const NextImage = React.forwardRef<HTMLImageElement, Props>(({ src, alt, ...rest }, ref) => {
  return <img ref={ref} alt={alt} src={resolveSrc(src)} {...rest} />;
});

NextImage.displayName = 'NextImageMock';

export default NextImage;
