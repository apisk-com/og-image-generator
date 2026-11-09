// Reads the card text from a query string, and signs it.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { TEMPLATE_VERSION } from './card.js';

const MAX_TITLE = 120;
const MAX_SUBTITLE = 200;

// An error that the API returns to the client with its status code.
export function httpError(status, message) {
  return Object.assign(new Error(message), { status, expose: true });
}

export function parseCardInput(query) {
  return {
    title: readText(query.title, 'title', MAX_TITLE, true),
    subtitle: readText(query.subtitle, 'subtitle', MAX_SUBTITLE, false),
  };
}

function readText(value, name, maxLength, required) {
  if (value === undefined && !required) return '';
  // A repeated parameter (?title=a&title=b) arrives as an array.
  if (typeof value !== 'string') {
    throw httpError(400, `"${name}" must be one text value.`);
  }
  // One space for each run of spaces, line breaks and control characters.
  // The same text then gives the same image, signature and cache key.
  const text = value.replace(/[\s\p{Cc}]+/gu, ' ').trim();
  if (required && text === '') {
    throw httpError(400, `"${name}" is required.`);
  }
  if ([...text].length > maxLength) {
    throw httpError(400, `"${name}" is longer than ${maxLength} characters.`);
  }
  return text;
}

// The exact text that the signature and the cache key cover.
export function canonical({ title, subtitle }, version = TEMPLATE_VERSION) {
  return JSON.stringify([version, title, subtitle]);
}

// HMAC-SHA256 of the input: only the holder of the secret can make valid URLs.
export function sign(input, secret, version = TEMPLATE_VERSION) {
  return createHmac('sha256', secret).update(canonical(input, version)).digest('base64url');
}

export function hasValidSignature(query, input, secret) {
  if (typeof query.sig !== 'string' || typeof query.v !== 'string') return false;
  const expected = Buffer.from(sign(input, secret, query.v));
  const given = Buffer.from(query.sig);
  // timingSafeEqual throws for buffers of different lengths.
  return given.length === expected.length && timingSafeEqual(given, expected);
}
