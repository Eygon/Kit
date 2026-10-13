const LINE_ENDINGS = /\r\n?/g;

export const normalizeLineEndings = (value: string): string => value.replace(LINE_ENDINGS, "\n");
