import React, { useState, useRef, useEffect } from 'react';

interface PasswordModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const PASSWORD = 'Facility1234';

const PasswordModal: React.FC<PasswordModalProps> = ({ onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus the input field when the modal opens
    inputRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === PASSWORD) {
      onSuccess();
    } else {
      setError('Incorrect password. Please try again.');
      setPassword(''); // Clear the input field
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 transition-opacity"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-modal-title"
    >
      <div 
        className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-white/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="password-modal-title" className="text-xl font-bold text-white">Enter Edit Mode</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl" aria-label="Close">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password-input" className="block text-sm font-medium text-gray-400 mb-1.5">Password</label>
            <input 
              ref={inputRef}
              id="password-input" 
              type="password" 
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                if (error) setError(''); // Clear error on new input
              }}
              className={`w-full bg-gray-900/70 border rounded-lg p-2.5 text-gray-200 placeholder-gray-500 focus:ring-2 focus:outline-none transition-all ${error ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500' : 'border-white/10 focus:ring-sky-500/50 focus:border-sky-500'}`}
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="bg-white/5 border border-white/10 hover:bg-white/10 text-gray-200 font-semibold py-2 px-4 rounded-lg transition-all text-sm"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-lg transition-all text-sm shadow-md shadow-green-600/20"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordModal;
