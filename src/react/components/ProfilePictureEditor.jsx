import { lazy, Suspense } from 'react';
import { Modal } from './forms.jsx';
import { Spinner } from './ui.jsx';

const Editor = lazy(() => import('./ProfilePictureDialog.jsx').then(module => ({ default: module.ProfilePictureDialog })));

export function ProfilePictureEditor({ open, onClose, returnFocusRef }) {
  return open ? <Suspense fallback={<Modal open title="Change profile picture" onClose={onClose} returnFocusRef={returnFocusRef}><Spinner /></Modal>}>
    <Editor onClose={onClose} returnFocusRef={returnFocusRef} />
  </Suspense> : null;
}
