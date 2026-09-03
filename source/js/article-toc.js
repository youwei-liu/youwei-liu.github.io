(() => {
  const containers = document.querySelectorAll('.article-toc-inline');
  if (!containers.length) return;

  containers.forEach(container => {
    const article = container.closest('#article-container');
    if (!article) return;

    const headings = Array.from(article.querySelectorAll('h2, h3'))
      .filter(heading => heading !== container && !heading.closest('.article-toc-inline'));
    if (!headings.length) { container.remove(); return; }

    const list = document.createElement('ol');
    headings.forEach(heading => {
      if (!heading.id) return;
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent.trim();
      item.appendChild(link);
      list.appendChild(item);
    });

    const title = document.createElement('div');
    title.className = 'inline-toc-title';
    title.textContent = container.dataset.tocTitle || '本文目录';
    container.append(title, list);
  });
})();
