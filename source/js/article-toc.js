(() => {
  const containers = document.querySelectorAll('.article-toc-inline');
  if (!containers.length) return;

  containers.forEach(container => {
    const article = container.closest('#article-container');
    if (!article) return;

    const headings = Array.from(article.querySelectorAll('h1, h2, h3'))
      .filter(heading => heading !== container && !heading.closest('.article-toc-inline'));
    if (!headings.length) { container.remove(); return; }

    const manualNumberPattern = /^(?:\d+(?:\.\d+)*[.、．]|Q\d+[：:.])/i;
    const hasManualNumbering = headings.some(heading =>
      manualNumberPattern.test(heading.textContent.trim())
    );
    const listTag = hasManualNumbering ? 'ul' : 'ol';
    const list = document.createElement(listTag);
    if (hasManualNumbering) list.className = 'manual-numbering';
    const rootLevel = Math.min(...headings.map(heading => Number(heading.tagName.slice(1))));
    const listStack = [{ level: rootLevel, list }];

    headings.forEach(heading => {
      const level = Number(heading.tagName.slice(1));

      while (listStack.length > 1 && listStack.at(-1).level > level) {
        listStack.pop();
      }

      if (listStack.at(-1).level < level) {
        const parentItem = listStack.at(-1).list.lastElementChild;
        if (parentItem) {
          const childList = document.createElement(listTag);
          parentItem.appendChild(childList);
          listStack.push({ level, list: childList });
        }
      }

      const item = document.createElement('li');
      item.className = `inline-toc-level-${level}`;
      const label = document.createElement(heading.id ? 'a' : 'span');
      if (heading.id) label.href = `#${heading.id}`;
      label.textContent = heading.textContent.trim();
      item.appendChild(label);
      listStack.at(-1).list.appendChild(item);
    });

    const title = document.createElement('div');
    title.className = 'inline-toc-title';
    title.textContent = container.dataset.tocTitle || '本文目录';
    container.append(title, list);
  });
})();
