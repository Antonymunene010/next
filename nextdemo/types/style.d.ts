declare module 'clsx' {
  export type ClassValue = string | number | boolean | undefined | null | ClassValue[];
  export default function clsx(...inputs: ClassValue[]): string;
}

declare module 'tailwind-merge' {
  export function twMerge(...inputs: string[]): string;
} 