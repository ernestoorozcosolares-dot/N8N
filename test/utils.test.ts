import { describe, it, expect } from 'vitest';
import { slugify, hmac, verifyHmac } from '../src/utils.js';

describe('utils', () => {
  it('slugify works', () => {
    expect(slugify('Hola Mundo! Prueba')).toBe('hola-mundo-prueba');
  });
  it('hmac verify', () => {
    const sig = hmac('abc', 'secret');
    expect(verifyHmac('abc', sig, 'secret')).toBe(true);
  });
});
