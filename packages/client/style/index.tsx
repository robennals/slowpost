import type { ComponentPropsWithoutRef, CSSProperties, ElementType, ReactNode } from 'react';
import styles from './system.module.css';

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

type GapScale = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type PadScale = GapScale;

type AlignOption = 'start' | 'center' | 'end' | 'stretch';
type JustifyOption = 'start' | 'center' | 'end';

type PolymorphicProps<T extends ElementType, Props> = Props & {
  as?: T;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, keyof Props | 'as' | 'className'>;

function gapClass(gap: GapScale) {
  return styles[`gap-${gap}` as const];
}

function alignClass(align?: AlignOption) {
  if (!align) return undefined;
  return styles[`align-${align}` as const];
}

function justifyClass(justify?: JustifyOption) {
  if (!justify) return undefined;
  return styles[`justify-${justify}` as const];
}

type BoxProps<T extends ElementType> = PolymorphicProps<
  T,
  {
    children?: ReactNode;
    gap?: GapScale;
    spread?: boolean;
    center?: boolean;
    align?: AlignOption;
    justify?: JustifyOption;
    wrap?: boolean;
    list?: boolean;
  }
>;

export function HorizBox<T extends ElementType = 'div'>({
  as,
  children,
  gap = 'md',
  spread,
  center,
  align,
  justify,
  wrap,
  list,
  className,
  ...rest
}: BoxProps<T>) {
  const Component = (as ?? 'div') as ElementType;
  const finalAlign = align ?? (center ? 'center' : undefined);
  return (
    <Component
      className={cx(
        styles.box,
        styles.horiz,
        gapClass(gap),
        spread && styles.spread,
        finalAlign && alignClass(finalAlign),
        justifyClass(justify),
        wrap && styles.wrap,
        list && styles.listReset,
        className
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}

export function VertBox<T extends ElementType = 'div'>({
  as,
  children,
  gap = 'md',
  spread,
  center,
  align,
  justify,
  wrap,
  list,
  className,
  ...rest
}: BoxProps<T>) {
  const Component = (as ?? 'div') as ElementType;
  const finalAlign = align ?? (center ? 'center' : undefined);
  return (
    <Component
      className={cx(
        styles.box,
        styles.vert,
        gapClass(gap),
        spread && styles.spread,
        finalAlign && alignClass(finalAlign),
        justifyClass(justify),
        wrap && styles.wrap,
        list && styles.listReset,
        className
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}

type PadBoxProps<T extends ElementType> = PolymorphicProps<
  T,
  {
    children?: ReactNode;
    horiz?: PadScale;
    vert?: PadScale;
  }
>;

export function PadBox<T extends ElementType = 'div'>({
  as,
  children,
  horiz = 'md',
  vert = 'md',
  className,
  ...rest
}: PadBoxProps<T>) {
  const Component = (as ?? 'div') as ElementType;
  return (
    <Component
      className={cx(
        styles.padBox,
        styles[`padHoriz-${horiz}` as const],
        styles[`padVert-${vert}` as const],
        className
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}

type PadProps<T extends ElementType> = PolymorphicProps<
  T,
  {
    pad?: PadScale;
    axis?: 'vertical' | 'horizontal';
  }
>;

export function Pad<T extends ElementType = 'div'>({
  as,
  pad = 'md',
  axis = 'vertical',
  className,
  ...rest
}: PadProps<T>) {
  const Component = (as ?? 'div') as ElementType;
  return (
    <Component
      aria-hidden
      className={cx(styles.pad, styles[`padSize-${pad}` as const], styles[`padAxis-${axis}` as const], className)}
      {...rest}
    />
  );
}

type CardTone = 'raised' | 'panel' | 'warm' | 'outline' | 'gradient' | 'navy';
type CardMargin = 'none' | 'sm' | 'md' | 'lg' | 'xl';

const marginValues: Record<CardMargin, string> = {
  none: '0',
  sm: '1rem',
  md: '1.5rem',
  lg: '2rem',
  xl: '3rem'
};

type CardProps<T extends ElementType> = PolymorphicProps<
  T,
  {
    children?: ReactNode;
    tone?: CardTone;
    margin?: CardMargin;
    maxWidth?: number;
  }
>;

export function Card<T extends ElementType = 'section'>({
  as,
  children,
  tone = 'raised',
  margin = 'lg',
  maxWidth,
  className,
  style,
  ...rest
}: CardProps<T>) {
  const Component = (as ?? 'section') as ElementType;
  const cardStyle: CSSProperties = { ...((style as CSSProperties) ?? {}) };
  const styleWithVars = cardStyle as Record<string, unknown>;
  styleWithVars['--card-margin'] = marginValues[margin];
  if (typeof maxWidth === 'number') {
    styleWithVars['--card-max-width'] = `${maxWidth}px`;
  }
  return (
    <Component
      className={cx(styles.card, styles[`cardTone-${tone}` as const], className)}
      style={cardStyle}
      {...rest}
    >
      {children}
    </Component>
  );
}

type AvatarTone = 'plain' | 'strong' | 'bold';

type AvatarProps = ComponentPropsWithoutRef<'img'> & {
  size?: number;
  tone?: AvatarTone;
};

export function Avatar({ size = 56, tone = 'strong', className, style, ...rest }: AvatarProps) {
  const avatarStyle: CSSProperties = { ...((style as CSSProperties) ?? {}), ['--avatar-size' as any]: `${size}px` };
  return <img className={cx(styles.avatar, styles[`avatarTone-${tone}` as const], className)} style={avatarStyle} {...rest} />;
}

type ButtonTone = 'primary' | 'accent' | 'muted' | 'warm' | 'outline';
type ButtonShape = 'rounded' | 'pill';

type ButtonProps<T extends ElementType> = PolymorphicProps<
  T,
  {
    children?: ReactNode;
    tone?: ButtonTone;
    shape?: ButtonShape;
  }
>;

export function Button<T extends ElementType = 'button'>({
  as,
  children,
  tone = 'primary',
  shape = 'rounded',
  className,
  ...rest
}: ButtonProps<T>) {
  const Component = (as ?? 'button') as ElementType;
  const finalProps: Record<string, unknown> = {
    className: cx(styles.button, styles[`buttonTone-${tone}` as const], shape === 'pill' && styles['buttonShape-pill'], className),
    ...rest
  };

  if (Component === 'button' && finalProps.type === undefined) {
    finalProps.type = 'button';
  }

  return <Component {...(finalProps as ComponentPropsWithoutRef<T>)}>{children}</Component>;
}

type TextSize = 'sm' | 'md' | 'lg';
type TextTone = 'default' | 'muted' | 'copper';
type TextWeight = 'regular' | 'semibold';

type TextProps<T extends ElementType> = PolymorphicProps<
  T,
  {
    children?: ReactNode;
    size?: TextSize;
    tone?: TextTone;
    weight?: TextWeight;
  }
>;

export function Text<T extends ElementType = 'p'>({
  as,
  children,
  size = 'md',
  tone = 'default',
  weight = 'regular',
  className,
  ...rest
}: TextProps<T>) {
  const Component = (as ?? 'p') as ElementType;
  return (
    <Component
      className={cx(styles.text, styles[`textSize-${size}` as const], styles[`textTone-${tone}` as const], styles[`textWeight-${weight}` as const], className)}
      {...rest}
    >
      {children}
    </Component>
  );
}

type TextInputProps = ComponentPropsWithoutRef<'input'>;

export function TextInput({ className, ...rest }: TextInputProps) {
  return <input className={cx(styles.input, className)} {...rest} />;
}

type TextAreaVariant = 'plain' | 'code';

type TextAreaProps = ComponentPropsWithoutRef<'textarea'> & {
  variant?: TextAreaVariant;
};

export function TextArea({ className, variant = 'plain', ...rest }: TextAreaProps) {
  return <textarea className={cx(styles.textarea, variant === 'code' && styles['textareaVariant-code'], className)} {...rest} />;
}

type TileGridProps<T extends ElementType> = PolymorphicProps<
  T,
  {
    children?: ReactNode;
    min?: number;
    gap?: GapScale;
  }
>;

export function TileGrid<T extends ElementType = 'div'>({
  as,
  children,
  min = 200,
  gap = 'md',
  className,
  style,
  ...rest
}: TileGridProps<T>) {
  const Component = (as ?? 'div') as ElementType;
  const gridStyle: CSSProperties = {
    ...((style as CSSProperties) ?? {}),
    ['--tile-min' as any]: `${min}px`
  };
  return (
    <Component className={cx(styles.tileGrid, styles[`tileGap-${gap}` as const], className)} style={gridStyle} {...rest}>
      {children}
    </Component>
  );
}

type AppBarProps<T extends ElementType> = PolymorphicProps<T, { children?: ReactNode }>;

export function AppBar<T extends ElementType = 'header'>({ as, children, className, ...rest }: AppBarProps<T>) {
  const Component = (as ?? 'header') as ElementType;
  return (
    <Component className={cx(styles.appBar, className)} {...rest}>
      {children}
    </Component>
  );
}

type AppBarTitleProps<T extends ElementType> = PolymorphicProps<T, { children?: ReactNode }>;

export function AppBarTitle<T extends ElementType = 'span'>({ as, children, className, ...rest }: AppBarTitleProps<T>) {
  const Component = (as ?? 'span') as ElementType;
  return (
    <Component className={cx(styles.appBarTitle, className)} {...rest}>
      {children}
    </Component>
  );
}

type AppBarActionProps<T extends ElementType> = PolymorphicProps<T, { children?: ReactNode }>;

export function AppBarAction<T extends ElementType = 'a'>({ as, children, className, ...rest }: AppBarActionProps<T>) {
  const Component = (as ?? 'a') as ElementType;
  return (
    <Component className={cx(styles.appBarAction, className)} {...rest}>
      {children}
    </Component>
  );
}
