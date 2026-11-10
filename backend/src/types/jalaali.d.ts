declare module 'jalaali-js' {
  export function toJalaali(date: Date): { jy: number; jm: number; jd: number };
  export function toJalaali(gy: number, gm: number, gd: number): { jy: number; jm: number; jd: number };
  export function toGregorian(jy: number, jm: number, jd: number): { gy: number; gm: number; gd: number };
  export function isLeapJalaaliYear(jy: number): boolean;
}
