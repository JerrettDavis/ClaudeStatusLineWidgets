const ESC = "\x1b[";
const RESET = `${ESC}0m`;

export function green(text: string): string {
  return `${ESC}32m${text}${RESET}`;
}

export function yellow(text: string): string {
  return `${ESC}33m${text}${RESET}`;
}

export function red(text: string): string {
  return `${ESC}31m${text}${RESET}`;
}

export function cyan(text: string): string {
  return `${ESC}36m${text}${RESET}`;
}

export function dim(text: string): string {
  return `${ESC}2m${text}${RESET}`;
}

export function bold(text: string): string {
  return `${ESC}1m${text}${RESET}`;
}
