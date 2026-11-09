// The card layout for satori: React-like element objects, no JSX and no React.
// Change TEMPLATE_VERSION when you change the layout: it is part of the image URL.
export const TEMPLATE_VERSION = '1';
export const WIDTH = 1200;
export const HEIGHT = 630;
const SITE_NAME = 'example.com';

// h('div', style, ...children) returns { type, props: { style, children } }.
function h(type, style, ...children) {
  return { type, props: { style, children } };
}

export function cardElement({ title, subtitle }) {
  return h(
    'div',
    {
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      padding: '64px 72px',
      backgroundColor: '#0f172a',
      backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
      color: '#f8fafc',
      fontFamily: 'Inter',
    },
    h('div', { fontSize: 28, fontWeight: 700, color: '#93c5fd' }, SITE_NAME),
    h(
      'div',
      {
        marginTop: 'auto',
        fontSize: 68,
        fontWeight: 700,
        lineHeight: 1.1,
        lineClamp: 3,
      },
      title,
    ),
    subtitle
      ? h('div', { marginTop: 24, fontSize: 32, lineHeight: 1.35, color: '#cbd5e1', lineClamp: 2 }, subtitle)
      : null,
    h('div', { marginTop: 40, width: 120, height: 8, borderRadius: 4, backgroundColor: '#38bdf8' }),
  );
}
