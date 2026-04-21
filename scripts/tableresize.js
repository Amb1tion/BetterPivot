const HANDLE_CLASS = 'bp-col-resize-handle';
const tableWidths = new WeakMap(); // table → array of measured widths by column index

function addResizeHandles() {
  const tables = document.querySelectorAll('table');
  if (!tables.length) return;

  tables.forEach(table => {
    table.style.borderCollapse = table.style.borderCollapse || 'collapse';

    const allThs = Array.from(table.querySelectorAll('th'));
    const unset = allThs.filter(th => !th.dataset.bpWidthSet);

    if (unset.length > 0 && allThs.length >= 2) {
      const stored = tableWidths.get(table) ?? [];

      const canReapply  = unset.filter(th => stored[th.cellIndex] != null);
      const needsMeasure = unset.filter(th => stored[th.cellIndex] == null);

      // Re-apply known widths with no reflow
      canReapply.forEach(th => {
        th.style.width = stored[th.cellIndex] + 'px';
        th.dataset.bpWidthSet = '1';
      });

      // Only reflow for genuinely new columns
      if (needsMeasure.length > 0) {
        const maxColWidth = (table.parentElement?.offsetWidth || window.innerWidth) * 0.4;
        table.style.tableLayout = 'auto';
        needsMeasure.forEach(th => { th.style.whiteSpace = 'nowrap'; th.style.width = ''; });
        void table.offsetWidth;
        needsMeasure.forEach(th => {
          const w = Math.min(th.offsetWidth, maxColWidth);
          th.style.width = w + 'px';
          th.dataset.bpWidthSet = '1';
          stored[th.cellIndex] = w;
        });
        tableWidths.set(table, stored);
      }

      table.style.tableLayout = 'fixed';
    } else if (unset.length === 0) {
      table.style.tableLayout = 'fixed';
    }
  });

  document.querySelectorAll('th').forEach(th => {
    if (th.querySelector('.' + HANDLE_CLASS)) return;

    const isFrozen = th.style.left !== '' || th.style.right !== '';
    th.style.position = isFrozen ? 'sticky' : 'relative';
    if (isFrozen) th.style.zIndex = '1000';
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
      const colIndex = th.cellIndex;
      const totalCols = th.closest('tr').cells.length;

      const onMove = e => {
        const newWidth = Math.max(40, startWidth + (e.pageX - startX));
        th.style.width = newWidth + 'px';

        // Persist so re-application after scroll doesn't revert to original measurement
        const stored = tableWidths.get(th.closest('table'));
        if (stored) stored[colIndex] = newWidth;

        // Sync matching column in all tables with the same column count
        // (handles split header/body table layouts)
        document.querySelectorAll('table').forEach(t => {
          const firstRow = t.querySelector('tr');
          if (!firstRow || firstRow.cells.length !== totalCols) return;
          t.querySelectorAll(`tr > *:nth-child(${colIndex + 1})`).forEach(cell => {
            if (cell !== th) cell.style.width = newWidth + 'px';
          });
          const s = tableWidths.get(t);
          if (s) s[colIndex] = newWidth;
        });
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

function disable() {
  if (activeObserver) {
    activeObserver.disconnect();
    activeObserver = null;
  }

  // Remove all resize handles
  document.querySelectorAll('.' + HANDLE_CLASS).forEach(el => el.remove());

  // Revert all th styles we applied so the page returns to normal
  document.querySelectorAll('th').forEach(th => {
    th.style.position = '';
    th.style.overflow = '';
    th.style.whiteSpace = '';
    th.style.zIndex = '';
    delete th.dataset.bpWidthSet;
  });

  // Revert table layout so the browser auto-sizes columns again
  document.querySelectorAll('table').forEach(table => {
    table.style.tableLayout = '';
    tableWidths.delete(table);
  });
}

function enable() {
  if (activeObserver) return;
  activeObserver = watchAndApply();
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

let activeObserver = null;

// Check stored preference on load — default to enabled
chrome.storage.local.get({ resizeEnabled: true }, ({ resizeEnabled }) => {
  if (resizeEnabled) activeObserver = watchAndApply();
});

// Listen for toggle messages from the popup
chrome.runtime.onMessage.addListener(msg => {
  if (msg.type !== 'BP_RESIZE_TOGGLE') return;
  msg.enabled ? enable() : disable();
});

navigation.addEventListener('navigate', () => {
  if (activeObserver) {
    activeObserver.disconnect();
    activeObserver = null;
  }
  // Re-check stored preference on navigation
  chrome.storage.local.get({ resizeEnabled: true }, ({ resizeEnabled }) => {
    if (resizeEnabled) activeObserver = watchAndApply();
  });
});
