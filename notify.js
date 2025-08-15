// notify.js — simple toast notifications
export function ensureToastRoot() {
  let root = document.getElementById('toast-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toast-root';
    root.style.position = 'fixed';
    root.style.top = '16px';
    root.style.right = '16px';
    root.style.zIndex = '9999';
    document.body.appendChild(root);
  }
  return root;
}

export function toast(msg, type = 'info', ms = 3000) {
  const root = ensureToastRoot();
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.marginBottom = '10px';
  el.style.padding = '10px 12px';
  el.style.borderRadius = '12px';
  el.style.border = '1px solid rgba(255,255,255,0.18)';
  el.style.backdropFilter = 'blur(10px)';
  el.style.background = 'rgba(255,255,255,0.06)';
  el.style.color = '#e7ebf3';
  if (type === 'ok') el.style.borderColor = 'rgba(53,211,153,0.6)';
  if (type === 'err') el.style.borderColor = 'rgba(255,107,107,0.6)';
  root.appendChild(el);
  setTimeout(() => el.remove(), ms);
}
