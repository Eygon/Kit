export type Rgb = readonly [number, number, number];

const MAX_CHANNEL = 255;

const toLinear = (channel: number) => {
  const value = channel / MAX_CHANNEL;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

const fromLinear = (value: number) => {
  const clamped = Math.min(1, Math.max(0, value));
  return Math.round(MAX_CHANNEL * (clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055));
};

export const parseHex = (hex: string): Rgb => {
  const digits = hex.replace("#", "");
  return [0, 2, 4].map((start) => parseInt(digits.slice(start, start + 2), 16)) as unknown as Rgb;
};

const toOklab = ([red, green, blue]: Rgb): Rgb => {
  const r = toLinear(red);
  const g = toLinear(green);
  const b = toLinear(blue);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

const fromOklab = ([lightness, a, b]: Rgb): Rgb => {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
};

export const mixInOklab = (first: Rgb, firstShare: number, second: Rgb): Rgb => {
  const firstLab = toOklab(first);
  const secondLab = toOklab(second);
  return fromOklab(
    firstLab.map((value, index) => value * firstShare + secondLab[index] * (1 - firstShare)) as unknown as Rgb,
  );
};

export const blendOver = (foreground: Rgb, opacity: number, background: Rgb): Rgb =>
  foreground.map((value, index) => Math.round(value * opacity + background[index] * (1 - opacity))) as unknown as Rgb;

const luminance = ([red, green, blue]: Rgb) =>
  0.2126 * toLinear(red) + 0.7152 * toLinear(green) + 0.0722 * toLinear(blue);

export const contrastRatio = (first: Rgb, second: Rgb) => {
  const firstLuminance = luminance(first);
  const secondLuminance = luminance(second);
  return (Math.max(firstLuminance, secondLuminance) + 0.05) / (Math.min(firstLuminance, secondLuminance) + 0.05);
};
