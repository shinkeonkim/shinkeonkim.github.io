import { escapeHtml } from './utils';

export interface ModalField {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'select';
  value?: string;
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  rows?: number;
  hint?: string;
}

export interface ModalOptions {
  title: string;
  description?: string;
  fields?: ModalField[];
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  body?: string;
}

export interface ModalResult {
  confirmed: boolean;
  values: Record<string, string>;
}

let host: HTMLDialogElement | null = null;
let suppressNextClose = false;

export function ensureHost(): HTMLDialogElement {
  if (host) return host;
  const dialog = document.createElement('dialog');
  dialog.className = 'editor-modal';
  dialog.id = 'editor-modal-host';
  document.body.appendChild(dialog);
  host = dialog;
  return dialog;
}

function buildField(field: ModalField): string {
  const id = `editor-modal-field-${field.name}`;
  const value = field.value ?? '';
  const hint = field.hint
    ? `<small class="editor-modal-hint">${escapeHtml(field.hint)}</small>`
    : '';
  if (field.type === 'textarea') {
    return `<label class="editor-modal-field"><span>${escapeHtml(field.label)}</span><textarea id="${id}" name="${field.name}" rows="${field.rows ?? 4}" ${field.required ? 'required' : ''} placeholder="${escapeHtml(field.placeholder ?? '')}">${escapeHtml(value)}</textarea>${hint}</label>`;
  }
  if (field.type === 'select') {
    const opts = (field.options ?? [])
      .map(
        (o) =>
          `<option value="${escapeHtml(o.value)}"${o.value === value ? ' selected' : ''}>${escapeHtml(o.label)}</option>`,
      )
      .join('');
    return `<label class="editor-modal-field"><span>${escapeHtml(field.label)}</span><select id="${id}" name="${field.name}" ${field.required ? 'required' : ''}>${opts}</select>${hint}</label>`;
  }
  return `<label class="editor-modal-field"><span>${escapeHtml(field.label)}</span><input id="${id}" name="${field.name}" type="text" value="${escapeHtml(value)}" placeholder="${escapeHtml(field.placeholder ?? '')}" ${field.required ? 'required' : ''} />${hint}</label>`;
}

export function openModal(options: ModalOptions): Promise<ModalResult> {
  const dialog = ensureHost();
  const fields = options.fields ?? [];
  const fieldsHtml = fields.map(buildField).join('');
  const bodyHtml = options.body ? `<div class="editor-modal-body">${options.body}</div>` : '';
  const descriptionHtml = options.description
    ? `<p class="editor-modal-description">${escapeHtml(options.description)}</p>`
    : '';
  const confirmClass = options.danger ? 'editor-btn-danger' : 'editor-btn-primary';
  const html = `
    <form class="editor-modal-form" data-editor-modal-form>
      <header class="editor-modal-header">
        <h2 class="editor-modal-title">${escapeHtml(options.title)}</h2>
        <button type="button" class="editor-modal-close" data-editor-modal-cancel aria-label="닫기">✕</button>
      </header>
      ${descriptionHtml}
      ${bodyHtml}
      ${fieldsHtml}
      <footer class="editor-modal-actions">
        <button type="button" class="editor-btn" data-editor-modal-cancel>${escapeHtml(options.cancelLabel ?? '취소')}</button>
        <button type="submit" class="editor-btn ${confirmClass}" data-editor-modal-confirm>${escapeHtml(options.confirmLabel ?? '확인')}</button>
      </footer>
    </form>
  `;
  dialog.innerHTML = html;

  return new Promise<ModalResult>((resolve) => {
    let settled = false;
    function finish(result: ModalResult) {
      if (settled) return;
      settled = true;
      dialog.removeEventListener('close', onClose);
      if (dialog.open) {
        suppressNextClose = true;
        dialog.close();
      }
      resolve(result);
    }
    const onClose = () => {
      if (suppressNextClose) {
        suppressNextClose = false;
        return;
      }
      finish({ confirmed: false, values: {} });
    };
    dialog.addEventListener('close', onClose, { once: true });

    dialog.querySelectorAll<HTMLElement>('[data-editor-modal-cancel]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        finish({ confirmed: false, values: {} });
      });
    });
    const form = dialog.querySelector('form') as HTMLFormElement;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const values: Record<string, string> = {};
      for (const field of fields) {
        const input = form.elements.namedItem(field.name) as
          | HTMLInputElement
          | HTMLTextAreaElement
          | HTMLSelectElement
          | null;
        values[field.name] = input?.value ?? '';
      }
      finish({ confirmed: true, values });
    });

    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    const firstInput = dialog.querySelector<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >('input, textarea, select');
    if (firstInput) firstInput.focus();
  });
}

export async function confirmModal(options: {
  title: string;
  description?: string;
  danger?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
}): Promise<boolean> {
  const result = await openModal({
    title: options.title,
    description: options.description,
    confirmLabel: options.confirmLabel ?? '확인',
    cancelLabel: options.cancelLabel ?? '취소',
    danger: options.danger,
  });
  return result.confirmed;
}
