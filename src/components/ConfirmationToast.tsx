import { AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ConfirmationToastProps {
  message: string;
  address: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const showConfirmationToast = ({
  message,
  address,
  onConfirm,
  onCancel,
}: ConfirmationToastProps) => {
  toast.custom(
    (t) => (
      <div className="bg-police-blue-dark p-4 rounded-lg border border-police-red shadow-xl max-w-md">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="w-6 h-6 text-yellow-500" />
          <h3 className="text-white font-bold">Confirm Action</h3>
        </div>
        
        <p className="text-gray-300 text-sm mb-2">{message}</p>
        <p className="text-police-red font-mono text-sm bg-police-blue p-2 rounded mb-4">
          {address}
        </p>
        
        <div className="flex gap-2">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              onConfirm();
            }}
            className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold transition-colors"
          >
            Confirm
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              onCancel();
            }}
            className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    ),
    { duration: Infinity }
  );
};