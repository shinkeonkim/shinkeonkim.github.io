import type { ImageDialogController } from '@/dev-only/editor/ui/image-dialog';

export function setupEditorDropPaste(
  textarea: HTMLTextAreaElement,
  imageDialog: ImageDialogController,
): void {
  textarea.addEventListener('dragover', (e) => {
    e.preventDefault();
    textarea.classList.add('editor-drag-hover');
  });
  textarea.addEventListener('dragleave', () => textarea.classList.remove('editor-drag-hover'));
  textarea.addEventListener('drop', async (e) => {
    e.preventDefault();
    textarea.classList.remove('editor-drag-hover');
    const file = e.dataTransfer?.files?.[0];
    if (file) await imageDialog.handleDroppedFile(file);
  });

  textarea.addEventListener('paste', async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) await imageDialog.handleDroppedFile(file);
        return;
      }
    }
  });
}
