import { useToast } from '../lib/toast';

export function ToastHost() {
  const { toast, hide } = useToast();
  if (!toast) return null;
  return (
    <div className="toast" role="status" key={toast.id}>
      <div className="grow">{toast.text}</div>
      {toast.action && (
        <button
          onClick={() => {
            toast.action!.run();
            hide(toast.id);
          }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
