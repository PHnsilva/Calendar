// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ModalShell from './ModalShell';

afterEach(cleanup);

describe('ModalShell accessibility options', () => {
  it('labels the dialog, focuses close and closes on Escape', async () => {
    const onClose = vi.fn();
    render(
      <ModalShell
        open
        ariaLabel="Modal administrativo"
        closeOnEscape
        focusCloseOnOpen
        onClose={onClose}
      >
        <p>Conteúdo</p>
      </ModalShell>,
    );

    expect(screen.getByRole('dialog', { name: 'Modal administrativo' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fechar modal' })).toBe(document.activeElement);
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('closes from the backdrop only when enabled', () => {
    const onClose = vi.fn();
    const { container } = render(
      <ModalShell open closeOnBackdrop onClose={onClose} ariaLabel="Modal administrativo">
        <button type="button">Ação interna</button>
      </ModalShell>,
    );
    const backdrop = container.firstElementChild as HTMLElement;

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Ação interna' }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('can omit the close control for a mandatory selection dialog', () => {
    render(
      <ModalShell open ariaLabel="Escolha obrigatória" onClose={() => undefined} showCloseButton={false}>
        <p>Escolha um workspace</p>
      </ModalShell>,
    );

    expect(screen.getByRole('dialog', { name: 'Escolha obrigatória' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /fechar/i })).toBeNull();
  });

  it('blocks every dismissal control while closing is disabled', () => {
    const onClose = vi.fn();
    const { container } = render(
      <ModalShell open ariaLabel="Enviando" closeDisabled closeOnBackdrop closeOnEscape onClose={onClose}>
        <button type="button">Conteúdo interno</button>
      </ModalShell>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.mouseDown(container.firstElementChild as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'Fechar modal' }));
    expect(onClose).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Fechar modal' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
