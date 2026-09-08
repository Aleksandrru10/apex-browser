// Distraction-free reader mode parser for Apex Browser

function generateReaderExtractionScript() {
  return `(() => {
    try {
      const title = document.querySelector('h1')?.innerText?.trim() || document.title || 'Статья';
      
      // Look for author / byline
      let byline = '';
      const bylineEl = document.querySelector('[rel="author"], .byline, .author, time, .date');
      if (bylineEl) byline = bylineEl.innerText.trim();

      // Find best candidate container
      const candidates = Array.from(document.querySelectorAll('article, [role="main"], main, .post-content, .article-content, .entry-content, #content, .content'));
      let bestEl = candidates[0] || document.body;

      if (!candidates[0]) {
        // Find element with most paragraphs
        let maxP = 0;
        document.querySelectorAll('div, section').forEach(el => {
          const pCount = el.querySelectorAll('p').length;
          if (pCount > maxP) {
            maxP = pCount;
            bestEl = el;
          }
        });
      }

      // Clone so we don't mutate the live page
      const clone = bestEl.cloneNode(true);

      // Clean unwanted elements
      const unwanted = clone.querySelectorAll('script, style, nav, footer, header, aside, .ad, .ads, .advertisement, [role="banner"], [role="navigation"], .sidebar, .comments, .social-share, iframe');
      unwanted.forEach(el => el.remove());

      // Extract text content & images
      const blocks = [];
      clone.querySelectorAll('h1, h2, h3, h4, p, img, blockquote, pre, ul, ol').forEach(el => {
        const tag = el.tagName.toLowerCase();
        if (tag === 'img') {
          const src = el.getAttribute('src');
          if (src && !src.startsWith('data:') && el.width > 80 && el.height > 80) {
            blocks.push({ type: 'img', src, alt: el.getAttribute('alt') || '' });
          }
        } else if (tag === 'blockquote') {
          const text = el.innerText.trim();
          if (text) blocks.push({ type: 'quote', text });
        } else if (tag === 'pre') {
          const text = el.innerText.trim();
          if (text) blocks.push({ type: 'code', text });
        } else if (tag === 'ul' || tag === 'ol') {
          const items = Array.from(el.querySelectorAll('li')).map(li => li.innerText.trim()).filter(Boolean);
          if (items.length) blocks.push({ type: 'list', items });
        } else if (['h1', 'h2', 'h3', 'h4'].includes(tag)) {
          const text = el.innerText.trim();
          if (text) blocks.push({ type: 'heading', level: tag, text });
        } else {
          const text = el.innerText.trim();
          if (text && text.length > 20) blocks.push({ type: 'p', text });
        }
      });

      const totalWords = blocks.reduce((acc, b) => acc + (b.text ? b.text.split(/\\s+/).length : 0), 0);
      const readingMinutes = Math.max(1, Math.ceil(totalWords / 200));

      return {
        success: true,
        title,
        byline,
        url: window.location.href,
        readingMinutes,
        wordCount: totalWords,
        blocks
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  })()`;
}

module.exports = {
  generateReaderExtractionScript
};
