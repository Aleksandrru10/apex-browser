// Live search suggestions provider for Apex Omnibox

async function getSearchSuggestions(query, engine = 'google') {
  if (!query || query.trim().length === 0) return [];
  const q = encodeURIComponent(query.trim());

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    let url = '';
    if (engine === 'duckduckgo') {
      url = `https://duckduckgo.com/ac/?q=${q}&type=list`;
    } else {
      // Google suggestions API (Chrome default)
      url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${q}`;
    }

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/134.0.0.0 Safari/537.36'
      }
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const data = await res.json();
    
    // Both Google and DDG return [query, [sug1, sug2, sug3, ...]]
    if (Array.isArray(data) && Array.isArray(data[1])) {
      return data[1].slice(0, 7);
    }
    return [];
  } catch (err) {
    return [];
  }
}

module.exports = {
  getSearchSuggestions
};
