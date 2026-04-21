const HANDLE_CLASS = 'bp-col-resize-handle';

function addResizeHandles() {
  const tables = document.querySelectorAll('table');
  if (!tables.length) return;

  tables.forEach(table => {
    table.style.borderCollapse = table.style.borderCollapse || 'collapse';

    // Measure natural content widths before locking to fixed layout
    table.style.tableLayout = 'auto';
    table.querySelectorAll('th').forEach(th => {
      if (!th.dataset.bpWidthSet) {
        th.style.whiteSpace = 'nowrap';
        th.style.width = '';
      }
    });

    // Force reflow so offsetWidth reflects content-fit widths
    void table.offsetWidth;

    table.querySelectorAll('th').forEach(th => {
      if (!th.dataset.bpWidthSet) {
        th.style.width = th.offsetWidth + 'px';
        th.dataset.bpWidthSet = '1';
      }
    });

    table.style.tableLayout = 'fixed';
  });

  document.querySelectorAll('th').forEach(th => {
    if (th.querySelector('.' + HANDLE_CLASS)) return;

    th.style.position = 'relative';
    th.style.overflow = 'hidden';
    th.style.whiteSpace = 'nowrap';

    const handle = document.createElement('div');
    handle.className = HANDLE_CLASS;
    handle.style.cssText = [
      'position:absolute',
      'right:0',
      'top:0',
      'width:6px',
      'height:100%',
      'cursor:col-resize',
      'user-select:none',
      'z-index:10',
      'background:transparent',
    ].join(';');

    handle.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.pageX;
      const startWidth = th.offsetWidth;

      const onMove = e => {
        const newWidth = Math.max(40, startWidth + (e.pageX - startX));
        th.style.width = newWidth + 'px';
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    th.appendChild(handle);
  });
}

function watchAndApply() {
  let pending = null;
  const observer = new MutationObserver(() => {
    if (!document.querySelector('th')) return;
    clearTimeout(pending);
    pending = setTimeout(() => addResizeHandles(), 200);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  addResizeHandles();
  return observer;
}

let activeObserver = watchAndApply();

navigation.addEventListener('navigate', () => {
  if (activeObserver) activeObserver.disconnect();
  activeObserver = watchAndApply();
});
