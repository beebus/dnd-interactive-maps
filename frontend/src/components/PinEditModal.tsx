import React, { useState } from 'react';
import './Modal.css';

export interface PinEditModalLocation {
  id: string;
  name: string;
  x: number;
  y: number;
  pois: { title: string; description: string }[];
}

interface PinEditModalProps {
  location: PinEditModalLocation;
  onClose: () => void;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function PinEditModal({ location, onClose, onRename, onDelete }: PinEditModalProps) {
  const [name, setName] = useState(location.name);
  const [status, setStatus] = useState<'idle' | 'saving' | 'deleting'>('idle');
  const [error, setError] = useState<string | null>(null);

  const canSave = name.trim().length > 0 && status === 'idle';

  async function handleSave() {
    if (!canSave) return;
    setStatus('saving');
    setError(null);
    try {
      await onRename(location.id, name.trim());
      onClose();
    } catch {
      setError('Failed to rename location.');
      setStatus('idle');
    }
  }

  async function handleDelete() {
    const poiCount = location.pois.length;
    const poiWarning = poiCount > 0 ? ` This will also remove ${poiCount} linked point(s) of interest.` : '';
    if (!window.confirm(`Delete "${location.name}"?${poiWarning}`)) return;

    setStatus('deleting');
    setError(null);
    try {
      await onDelete(location.id);
      onClose();
    } catch {
      setError('Failed to delete location.');
      setStatus('idle');
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <h2 className="modal-title">Edit Location</h2>

        <div className="modal-field">
          <label htmlFor="pin-edit-name">Name</label>
          <input
            id="pin-edit-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        {error && <p className="modal-error">{error}</p>}

        <div className="modal-actions">
          <button className="modal-submit" onClick={handleSave} disabled={!canSave}>
            {status === 'saving' ? 'Saving…' : 'Save'}
          </button>
          <button className="modal-delete" onClick={handleDelete} disabled={status !== 'idle'}>
            {status === 'deleting' ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
