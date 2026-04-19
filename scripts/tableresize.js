function applyResize() {
  const observer = new MutationObserver(() => {
    if (document.querySelector('th')) {
      observer.disconnect();
      document.querySelectorAll('th').forEach(th => {
        const div = th.querySelector('div');

        th.style.minWidth = 'max-content';
        th.style.width = 'auto';

        if (div) {
          div.style.resize = 'horizontal';
          div.style.overflow = 'auto';
          div.style.minWidth = 'max-content';
          div.style.display = 'inline-block';
          div.style.width = '100%';
        }
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

applyResize();

navigation.addEventListener('navigate', (event) => {
  if (event.destination.url.includes('/devices')) {
    applyResize();
  }
});
