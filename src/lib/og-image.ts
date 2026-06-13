import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SITE_TITLE, SITE_AUTHOR } from '../consts';

const FONT_DIR = join(process.cwd(), '.cache', 'fonts', 'pretendard');

interface FontEntry {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: 'normal';
}

let cachedFonts: FontEntry[] | null = null;

async function loadFonts(): Promise<FontEntry[]> {
  if (cachedFonts) return cachedFonts;
  const [regular, bold] = await Promise.all([
    readFile(join(FONT_DIR, 'Pretendard-Regular.ttf')),
    readFile(join(FONT_DIR, 'Pretendard-Bold.ttf')),
  ]);
  cachedFonts = [
    { name: 'Pretendard', data: regular.buffer.slice(regular.byteOffset, regular.byteOffset + regular.byteLength) as ArrayBuffer, weight: 400, style: 'normal' },
    { name: 'Pretendard', data: bold.buffer.slice(bold.byteOffset, bold.byteOffset + bold.byteLength) as ArrayBuffer, weight: 700, style: 'normal' },
  ];
  return cachedFonts;
}

export interface OgImageProps {
  title: string;
  description?: string;
  date?: Date;
  tags?: string[];
  category?: string;
  kind?: 'post' | 'wiki' | 'site';
}

const COLORS = {
  bg: '#0b0b0f',
  bgGradient: '#16161d',
  surface: '#1a1a23',
  fg: '#f4f4f5',
  fgMuted: '#c4c4cc',
  accent: '#a5b4fc',
  border: '#27272a',
  badge: '#312e81',
  badgeText: '#c7d2fe',
};

function formatDate(d?: Date): string {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildJsx(props: OgImageProps): React.ReactElement {
  const { title, description, date, tags = [], category, kind = 'post' } = props;
  const tagsTrimmed = tags.slice(0, 4);
  const kindLabel = kind === 'wiki' ? 'WIKI' : kind === 'site' ? 'SITE' : 'POST';

  return {
    type: 'div',
    key: null,
    props: {
      style: {
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: COLORS.bg,
        backgroundImage: `linear-gradient(135deg, ${COLORS.bg} 0%, ${COLORS.bgGradient} 100%)`,
        padding: '64px',
        color: COLORS.fg,
        fontFamily: 'Pretendard',
        position: 'relative',
      },
      children: [
        {
          type: 'div',
          key: 'header',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '20px',
              fontWeight: 700,
              color: COLORS.accent,
              letterSpacing: '0.05em',
            },
            children: [
              {
                type: 'div',
                key: 'kind',
                props: {
                  style: {
                    padding: '6px 14px',
                    backgroundColor: COLORS.badge,
                    color: COLORS.badgeText,
                    borderRadius: '999px',
                    fontSize: '16px',
                  },
                  children: kindLabel,
                },
              },
              category
                ? {
                    type: 'div',
                    key: 'cat',
                    props: { style: { color: COLORS.fgMuted, fontWeight: 400 }, children: `• ${category}` },
                  }
                : null,
            ].filter(Boolean),
          },
        },
        {
          type: 'div',
          key: 'middle',
          props: {
            style: {
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '24px',
            },
            children: [
              {
                type: 'div',
                key: 'title',
                props: {
                  style: {
                    fontSize: title.length > 40 ? '56px' : '72px',
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color: COLORS.fg,
                    letterSpacing: '-0.02em',
                  },
                  children: title,
                },
              },
              description
                ? {
                    type: 'div',
                    key: 'desc',
                    props: {
                      style: {
                        fontSize: '24px',
                        color: COLORS.fgMuted,
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      },
                      children: description.length > 120 ? description.slice(0, 117) + '…' : description,
                    },
                  }
                : null,
            ].filter(Boolean),
          },
        },
        {
          type: 'div',
          key: 'footer',
          props: {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: `1px solid ${COLORS.border}`,
              paddingTop: '24px',
            },
            children: [
              {
                type: 'div',
                key: 'left',
                props: {
                  style: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' },
                  children:
                    tagsTrimmed.length > 0
                      ? tagsTrimmed.map((t, i) => ({
                          type: 'div',
                          key: `tag-${i}`,
                          props: {
                            style: {
                              fontSize: '18px',
                              color: COLORS.fgMuted,
                              padding: '4px 12px',
                              border: `1px solid ${COLORS.border}`,
                              borderRadius: '6px',
                            },
                            children: `#${t}`,
                          },
                        }))
                      : [
                          {
                            type: 'div',
                            key: 'site',
                            props: { style: { fontSize: '18px', color: COLORS.fgMuted }, children: SITE_TITLE },
                          },
                        ],
                },
              },
              {
                type: 'div',
                key: 'right',
                props: {
                  style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' },
                  children: [
                    {
                      type: 'div',
                      key: 'date',
                      props: { style: { fontSize: '20px', fontWeight: 700, color: COLORS.fg }, children: formatDate(date) },
                    },
                    {
                      type: 'div',
                      key: 'author',
                      props: { style: { fontSize: '16px', color: COLORS.fgMuted }, children: SITE_AUTHOR },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  } as unknown as React.ReactElement;
}

export async function renderOgPng(props: OgImageProps): Promise<Buffer> {
  const fonts = await loadFonts();
  const svg = await satori(buildJsx(props), {
    width: 1200,
    height: 630,
    fonts: fonts as Parameters<typeof satori>[1]['fonts'],
  });
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
  });
  return resvg.render().asPng();
}
