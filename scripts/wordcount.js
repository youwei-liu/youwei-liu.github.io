const stripHTML = require('hexo-util').stripHTML;

// MathJax SVG contains thousands of path coordinates; never include that markup in reading stats.
const cleanContent = content => String(content || '')
  .replace(/<mjx-container[\s\S]*?<\/mjx-container>/gi, '')
  .replace(/<math[\s\S]*?<\/math>/gi, '')
  .replace(/<svg[\s\S]*?<\/svg>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<script[\s\S]*?<\/script>/gi, '');

const counter = content => {
  const text = stripHTML(cleanContent(content));
  const cn = (text.match(/[\u4E00-\u9FA5]/g) || []).length;
  const en = (text.replace(/[\u4E00-\u9FA5]/g, '').match(/[a-zA-Z0-9_\u0392-\u03c9\u0400-\u04FF]+|[\u4E00-\u9FFF\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af\u0400-\u04FF]+|[\u00E4\u00C4\u00E5\u00C5\u00F6\u00D6]+|\w+/g) || []).length;
  return [cn, en];
};

const readingTime = (content, { cn = 350, en = 160 } = {}) => {
  const len = counter(content);
  return Math.max(1, Math.floor(len[0] / cn + len[1] / en));
};

const displayCount = count => count < 1000 ? count : `${Math.round(count / 100) / 10}k`;

const registerHelpers = () => {
  hexo.extend.helper.register('wordcount', content => {
    const len = counter(content);
    return displayCount(len[0] + len[1]);
  });

  hexo.extend.helper.register('min2read', (content, options) => readingTime(content, options));

  hexo.extend.helper.register('totalcount', site => {
    let count = 0;
    site.posts.forEach(post => {
      const len = counter(post.content);
      count += len[0] + len[1];
    });
    return displayCount(count);
  });
};

hexo.on('ready', registerHelpers);
