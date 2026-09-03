(() => {
  const containers = document.querySelectorAll('.article-toc-inline');
  if (!containers.length) return;

  containers.forEach(container => {
    const article = container.closest('#article-container');
    if (!article) return;

    const headings = Array.from(article.querySelectorAll('h2, h3'))
      .filter(heading => heading !== container && !heading.closest('.article-toc-inline'));
    if (!headings.length) { container.remove(); return; }

    const manualNumberPattern = /^(?:\d+(?:\.\d+)*[.、．]|Q\d+[：:.])/i;
    const hasManualNumbering = headings.some(heading =>
      manualNumberPattern.test(heading.textContent.trim())
    );
    const list = document.createElement(hasManualNumbering ? 'ul' : 'ol');
    if (hasManualNumbering) list.className = 'manual-numbering';
    let currentSectionItem = null;

    headings.forEach(heading => {
      if (!heading.id) return;
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent.trim();
      item.appendChild(link);

      if (heading.tagName === 'H3' && currentSectionItem) {
        let childList = currentSectionItem.querySelector(':scope > ul');
        if (!childList) {
          childList = document.createElement('ul');
          currentSectionItem.appendChild(childList);
        }
        childList.appendChild(item);
      } else {
        list.appendChild(item);
        currentSectionItem = heading.tagName === 'H2' ? item : null;
      }
    });

    const title = document.createElement('div');
    title.className = 'inline-toc-title';
    title.textContent = container.dataset.tocTitle || '本文目录';
    container.append(title, list);
  });
})();
