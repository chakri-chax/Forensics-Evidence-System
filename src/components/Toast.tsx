/* eslint-disable @typescript-eslint/no-unused-vars */
// components/Toast.tsx
import { Toaster, toast } from 'react-hot-toast';
import { CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';

// Custom toast styles
export const toastStyles = {
  success: {
    icon: <CheckCircle className="w-5 h-5 text-green-500" />,
    style: {
      background: '#1a2c3a',
      color: '#fff',
      border: '1px solid #22c55e',
    },
  },
  error: {
    icon: <XCircle className="w-5 h-5 text-red-500" />,
    style: {
      background: '#1a2c3a',
      color: '#fff',
      border: '1px solid #ef4444',
    },
  },
  loading: {
    icon: <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-police-red" />,
    style: {
      background: '#1a2c3a',
      color: '#fff',
      border: '1px solid #3b82f6',
    },
  },
  info: {
    icon: <Info className="w-5 h-5 text-blue-500" />,
    style: {
      background: '#1a2c3a',
      color: '#fff',
      border: '1px solid #3b82f6',
    },
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
    style: {
      background: '#1a2c3a',
      color: '#fff',
      border: '1px solid #eab308',
    },
  },
};

// Toast wrapper component
export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          duration: 5000,
          style: {
            background: '#1a2c3a',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
            fontFamily: 'inherit',
          },
        }}
      />
      {children}
    </>
  );
};

// In your toast utility file
export const showToast = {
  success: (message: string | React.ReactNode, duration = 5000) => {
    if (typeof message === 'string') {
      toast.success(message, {
        ...toastStyles.success,
        duration,
      });
    } else {
      toast.custom(
        (t) => (
          <div className="bg-police-blue-dark p-4 rounded-lg border border-green-500 shadow-lg">
            {message}
          </div>
        ),
        { duration }
      );
    }
  },
  
  error: (message: string | React.ReactNode, duration = 5000) => {
    if (typeof message === 'string') {
      toast.error(message, {
        ...toastStyles.error,
        duration,
      });
    } else {
      toast.custom(
        (t) => (
          <div className="bg-police-blue-dark p-4 rounded-lg border border-red-500 shadow-lg">
            {message}
          </div>
        ),
        { duration }
      );
    }
  },
  
  info: (message: string | React.ReactNode, duration = 5000) => {
    if (typeof message === 'string') {
      toast(message, {
        ...toastStyles.info,
        duration,
      });
    } else {
      toast.custom(
        (t) => (
          <div className="bg-police-blue-dark p-4 rounded-lg border border-blue-500 shadow-lg">
            {message}
          </div>
        ),
        { duration }
      );
    }
  },
  
  loading: (message: string) => {
    return toast.loading(message, {
      ...toastStyles.loading,
    });
  },
  
  warning: (message: string | React.ReactNode, duration = 5000) => {
    if (typeof message === 'string') {
      toast(message, {
        ...toastStyles.warning,
        duration,
      });
    } else {
      toast.custom(
        (t) => (
          <div className="bg-police-blue-dark p-4 rounded-lg border border-yellow-500 shadow-lg">
            {message}
          </div>
        ),
        { duration }
      );
    }
  },
  
  dismiss: (toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  },
};