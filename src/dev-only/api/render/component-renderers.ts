import { codeToHtml } from 'shiki';
import { escapeHtml, placeholderHtml } from './jsx-parser';

async function shiki(text: string, lang: string): Promise<string> {
  try {
    return await codeToHtml(text, {
      lang,
      themes: { light: 'github-light', dark: 'one-dark-pro' },
    });
  } catch {
    return `<pre><code>${escapeHtml(text)}</code></pre>`;
  }
}

interface Variant {
  label?: string;
  language?: string;
  code?: string;
}

interface CaseSpec {
  label?: string;
  input?: string;
  output?: string;
  inputLanguage?: string;
  inputLabel?: string;
  outputLanguage?: string;
  outputLabel?: string;
}

async function renderCodeWithOutput(attrs: Record<string, unknown>): Promise<string> {
  const variantsRaw = Array.isArray(attrs.variants)
    ? (attrs.variants as Variant[])
    : attrs.code !== undefined && attrs.language !== undefined
      ? [
          {
            code: String(attrs.code),
            language: String(attrs.language),
            label: typeof attrs.label === 'string' ? attrs.label : undefined,
          },
        ]
      : [];
  if (variantsRaw.length === 0) return placeholderHtml('CodeWithOutput', '');

  const defaultOutputLanguage = String(attrs.outputLanguage ?? 'text');
  const defaultOutputLabel = String(attrs.outputLabel ?? '결과');
  const defaultInputLanguage = String(attrs.inputLanguage ?? 'text');
  const defaultInputLabel = String(attrs.inputLabel ?? 'stdin');
  const title = typeof attrs.title === 'string' ? attrs.title : null;
  const codeWidth = typeof attrs.codeWidth === 'number' ? attrs.codeWidth : null;

  const casesRaw = Array.isArray(attrs.cases) ? (attrs.cases as CaseSpec[]) : null;
  const resolvedCases: CaseSpec[] =
    casesRaw && casesRaw.length > 0
      ? casesRaw
      : [
          {
            input: typeof attrs.input === 'string' ? attrs.input : undefined,
            output: typeof attrs.output === 'string' ? attrs.output : '',
            inputLanguage: defaultInputLanguage,
            inputLabel: defaultInputLabel,
            outputLanguage: defaultOutputLanguage,
            outputLabel: defaultOutputLabel,
          },
        ];
  const isMultiCase = resolvedCases.length > 1;

  const variants = await Promise.all(
    variantsRaw.map(async (v) => {
      const code = String(v.code ?? '').trimEnd();
      const lang = String(v.language ?? 'text');
      return {
        label: v.label ?? lang,
        html: await shiki(code, lang),
      };
    }),
  );

  const renderedCases = await Promise.all(
    resolvedCases.map(async (c, i) => {
      const rawInput = typeof c.input === 'string' ? c.input : null;
      const hasInput = rawInput !== null && rawInput.length > 0;
      const output = typeof c.output === 'string' ? c.output : '';
      return {
        label: c.label ?? (isMultiCase ? `예제 ${i + 1}` : null),
        showLabel: isMultiCase || typeof c.label === 'string',
        hasInput,
        inputLabel: c.inputLabel ?? defaultInputLabel,
        outputLabel: c.outputLabel ?? defaultOutputLabel,
        inputHtml: hasInput
          ? await shiki(rawInput!.trimEnd(), c.inputLanguage ?? defaultInputLanguage)
          : '',
        outputHtml: await shiki(output.trimEnd(), c.outputLanguage ?? defaultOutputLanguage),
      };
    }),
  );

  const headerLeft =
    variants.length > 1
      ? `<div class="cwo-tabs" role="tablist">${variants
          .map(
            (v, i) =>
              `<button type="button" class="cwo-tab${i === 0 ? ' is-active' : ''}" data-cwo-tab="${i}" aria-selected="${i === 0}">${escapeHtml(v.label)}</button>`,
          )
          .join('')}</div>`
      : `<span class="cwo-label">${escapeHtml(variants[0].label)}</span>`;

  const variantPanes = variants
    .map(
      (v, i) =>
        `<div class="cwo-variant${i === 0 ? ' is-active' : ''}" data-cwo-variant="${i}">${v.html}</div>`,
    )
    .join('');

  const caseTabsHtml = isMultiCase
    ? `<div class="cwo-header cwo-case-tabs-header"><span class="cwo-dot cwo-dot-output"></span><div class="cwo-tabs cwo-case-tabs" role="tablist">${renderedCases
        .map(
          (c, i) =>
            `<button type="button" class="cwo-tab${i === 0 ? ' is-active' : ''}" data-cwo-case-tab="${i}" aria-selected="${i === 0}">${escapeHtml(c.label ?? `예제 ${i + 1}`)}</button>`,
        )
        .join('')}</div></div>`
    : '';

  const casePanelsHtml = renderedCases
    .map(
      (c, i) => `<div class="cwo-case${i === 0 ? ' is-active' : ''}" data-cwo-case-panel="${i}" data-has-input="${c.hasInput ? 'true' : 'false'}" aria-hidden="${i === 0 ? 'false' : 'true'}">
        ${
          c.hasInput
            ? `<div class="cwo-subpane cwo-subpane-stdin">
          <div class="cwo-header"><span class="cwo-dot cwo-dot-stdin"></span><span class="cwo-label">${escapeHtml(c.inputLabel)}</span></div>
          <div class="cwo-body">${c.inputHtml}</div>
        </div>`
            : ''
        }
        <div class="cwo-subpane cwo-subpane-stdout">
          <div class="cwo-header"><span class="cwo-dot cwo-dot-output"></span><span class="cwo-label">${escapeHtml(c.outputLabel)}</span></div>
          <div class="cwo-body">${c.outputHtml}</div>
        </div>
      </div>`,
    )
    .join('');

  const vertical = codeWidth !== null && codeWidth >= 99;
  const style =
    codeWidth !== null ? ` style="--cwo-code-pct:${Math.max(0, Math.min(100, codeWidth))}%"` : '';

  return `\n\n<figure class="code-with-output not-prose" data-cwo data-vertical="${vertical}" data-multi-case="${isMultiCase ? 'true' : 'false'}"${style}>
  ${title ? `<figcaption class="mb-2 text-sm font-medium" style="color:var(--color-fg-muted)">${escapeHtml(title)}</figcaption>` : ''}
  <div class="cwo-panes" data-cwo-panes>
    <div class="cwo-pane cwo-pane-code">
      <div class="cwo-header"><span class="cwo-dot cwo-dot-input"></span>${headerLeft}</div>
      <div class="cwo-body cwo-code-body">${variantPanes}</div>
    </div>
    <button type="button" class="cwo-splitter" aria-label="패널 너비 조절"><span class="cwo-splitter-grip"></span></button>
    <div class="cwo-pane cwo-pane-output">
      ${caseTabsHtml}
      <div class="cwo-case-panels">${casePanelsHtml}</div>
    </div>
  </div>
</figure>\n\n`;
}

export type ComponentRenderer = (attrs: Record<string, unknown>, inner?: string) => Promise<string>;

export const COMPONENT_RENDERERS: Record<string, ComponentRenderer> = {
  CodeWithOutput: renderCodeWithOutput,
};
