const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('==========================================');
console.log('🧪 RUNNING APEX BROWSER INTEGRATION TESTS');
console.log('==========================================\n');

// 1. Test ProfileStore
console.log('[Test 1] Testing Multi-Profile Engine & Storage...');
const ProfileStore = require('../main/profile-store');
const testStorageDir = path.join(__dirname, 'temp_storage');
if (fs.existsSync(testStorageDir)) {
  fs.rmSync(testStorageDir, { recursive: true, force: true });
}

const store = new ProfileStore(testStorageDir);
const initialProfiles = store.getAllProfiles();
console.log(`  ✓ Initialized with ${initialProfiles.length} default profiles`);
assert(initialProfiles.length >= 3, 'Should have at least 3 initial profiles');

// Create multiple new profiles (testing unlimited profiles creation requirement)
console.log('  Testing creation of multiple isolated profiles...');
const prof1 = store.createProfile({
  name: 'Крипто Трейдинг',
  avatar: '📈',
  color: '#f59e0b',
  proxy: { enabled: true, type: 'socks5', host: '10.0.0.1', port: 1080, username: 'trader', password: 'secretpassword' },
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1)'
});
assert(prof1.id.startsWith('profile_'), 'Profile should have a unique ID');
assert(prof1.partition === 'persist:' + prof1.id, 'Profile must have dedicated partition');
assert(prof1.proxy.enabled === true, 'Proxy should be enabled');
console.log(`  ✓ Created Profile 1: "${prof1.name}" with dedicated partition "${prof1.partition}"`);

const prof2 = store.createProfile({
  name: 'Клиент #42 E-commerce',
  avatar: '🛒',
  color: '#ec4899',
  proxy: { enabled: true, type: 'http', host: 'proxy.company.com', port: 8080 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1)'
});
console.log(`  ✓ Created Profile 2: "${prof2.name}" with dedicated partition "${prof2.partition}"`);

// Cloning
const cloned = store.cloneProfile(prof1.id, 'Крипто Трейдинг (Резерв)');
assert(cloned.id !== prof1.id, 'Clone must have unique ID');
assert(cloned.proxy.host === prof1.proxy.host, 'Clone must preserve proxy config');
console.log(`  ✓ Cloned Profile: "${cloned.name}" with ID "${cloned.id}"`);

// Updating
const updated = store.updateProfile(prof2.id, { name: 'Клиент #42 (Обновлено)', color: '#10b981' });
assert(updated.name === 'Клиент #42 (Обновлено)');
console.log(`  ✓ Updated profile successfully`);

// Verify all profiles count
const allProf = store.getAllProfiles();
console.log(`  ✓ Total profiles count: ${allProf.length}`);
assert(allProf.length >= 6, 'Should have 6 profiles total now');

// Bookmarks & History
console.log('\n[Test 2] Testing Bookmarks & History Store...');
const bm = store.addBookmark({ title: 'Apex Homepage', url: 'https://apex.local' });
assert(bm.id.startsWith('bm_'));
const allBm = store.getBookmarks();
assert(allBm.some(b => b.url === 'https://apex.local'));
console.log(`  ✓ Added and verified bookmark: "${bm.title}"`);

store.addHistory({ url: 'https://example.com/test', title: 'Example Test Page', profileId: prof1.id });
const hist = store.getHistory();
assert(hist.length > 0 && hist[0].url === 'https://example.com/test');
console.log(`  ✓ Saved history entry with profile tracking: "${hist[0].url}"`);

// Test searchHistory in Omnibox
store.addHistory({ url: 'https://timeweb.cloud/dashboard', title: 'Облачный хостинг TimeWeb Cloud', profileId: prof1.id });
store.addHistory({ url: 'https://github.com/torvalds/linux', title: 'Linux source code repository', profileId: prof1.id });

const timeWebMatches = store.searchHistory('Time Web');
assert(timeWebMatches.length > 0, 'Should find Time Web by multi-word title');
assert(timeWebMatches[0].url.includes('timeweb.cloud'), 'Top result should be timeweb.cloud');
console.log(`  ✓ Verified multi-word history search for "Time Web" -> "${timeWebMatches[0].title}" (${timeWebMatches[0].url})`);

const timewebDomainMatches = store.searchHistory('timeweb');
assert(timewebDomainMatches.length > 0, 'Should find timeweb by domain');
console.log(`  ✓ Verified domain history search for "timeweb" -> "${timewebDomainMatches[0].url}"`);

// Test HTML Bookmarks Import (universal browser format)
const htmlBookmarks = `
<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><A HREF="https://habr.com/ru/articles/" ADD_DATE="1600000000">Хабр статьи &amp; новости</A>
    <DT><A HREF="https://news.ycombinator.com" ADD_DATE="1600000001">Hacker News</A>
</DL><p>
`;
const htmlRes = store.importBookmarksFromHtml(htmlBookmarks);
assert(htmlRes.success === true && htmlRes.count === 2, 'Should import 2 bookmarks from HTML Netscape format');
const updatedBookmarks = store.getBookmarks();
assert(updatedBookmarks.some(b => b.url === 'https://news.ycombinator.com'));
assert(updatedBookmarks.some(b => b.title.includes('Хабр статьи & новости')));
console.log(`  ✓ Verified universal HTML Netscape format bookmarks import (${htmlRes.count} bookmarks)`);

// Notes (Easel)
console.log('\n[Test 3] Testing Quick Notes (Easel / Scratchpad)...');
store.saveNotes('# Мои исследовательские заметки\n- Пункт 1: Изоляция куки проверена\n- Пункт 2: Скорость Chromium отличная');
const notes = store.getNotes();
assert(notes.content.includes('Изоляция куки проверена'));
console.log(`  ✓ Saved and verified persistent scratchpad notes`);

// 2. Test AdBlocker
console.log('\n[Test 4] Testing Tracking & Ad Blocker (Firefox-style)...');
const adBlocker = require('../main/adblocker');
assert(adBlocker.isBlocked('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js') === true);
assert(adBlocker.isBlocked('https://www.google-analytics.com/analytics.js') === true);
assert(adBlocker.isBlocked('https://connect.facebook.net/en_US/fbevents.js') === true);
assert(adBlocker.isBlocked('https://mc.yandex.ru/metrika/watch.js') === true);
assert(adBlocker.isBlocked('https://wikipedia.org/wiki/Main_Page') === false);
assert(adBlocker.isBlocked('https://github.com/torvalds/linux') === false);
console.log('  ✓ Verified accurate blocking of trackers & ads while preserving safe websites');

// 3. Test Reader Mode Extraction Script
console.log('\n[Test 5] Testing Firefox-style Reader Mode parser...');
const { generateReaderExtractionScript } = require('../main/reader');
const script = generateReaderExtractionScript();
assert(script.includes('readability') || script.includes('readingMinutes') || script.includes('candidates'));
console.log('  ✓ Reader extraction script generated properly');

// 4. Test Search Suggestions API
console.log('\n[Test 6] Testing Omnibox Search Suggestions...');
const { getSearchSuggestions } = require('../main/search-suggestions');
getSearchSuggestions('electron browser').then(sugs => {
  console.log(`  ✓ Suggestions received: [${sugs.slice(0, 3).join(', ')}...] (${sugs.length} results)`);

  // 5. Test Password Migration & Store (Chrome / Edge / Firefox CSV Import & Autofill Matching)
  console.log('\n[Test 7] Testing Password Migration & Domain Autofill Matching...');
  const PasswordStore = require('../main/password-store');
  const pwdStore = new PasswordStore(testStorageDir);

  // 7a. Manual creation & CRUD
  const addRes = pwdStore.add({
    name: 'GitHub',
    url: 'https://github.com/login',
    username: 'developer@example.com',
    password: 'SuperSecretPassword123!',
    note: 'Primary developer token'
  });
  assert(addRes.success === true, 'Should successfully add credential');
  assert(addRes.entry.domain === 'github.com', 'Domain extraction should extract github.com');
  console.log('  ✓ Manually added credential with domain extraction');

  // 7b. Update
  const updateRes = pwdStore.update(addRes.entry.id, { note: 'Updated developer token' });
  assert(updateRes.success === true);
  assert(updateRes.entry.note === 'Updated developer token');
  console.log('  ✓ Updated credential successfully');

  // 7c. Chrome / Edge CSV Import simulation
  const chromeCsv = [
    'name,url,username,password,note',
    'Google Account,https://accounts.google.com/signin,user@gmail.com,GooglePass999,Personal account',
    'YouTube,https://www.youtube.com,user@gmail.com,YTPassword777,Video channel',
    'Reddit,https://www.reddit.com/login,redditor_99,RedditSecretKey,'
  ].join('\r\n');

  const chromeImport = pwdStore.importFromCsv(chromeCsv);
  assert(chromeImport.success === true && chromeImport.count === 3, 'Should import 3 passwords from Chrome CSV');
  console.log(`  ✓ Successfully imported ${chromeImport.count} credentials from Chrome/Edge CSV format`);

  // 7d. Firefox CSV format simulation ("url","username","password",...)
  const firefoxCsv = [
    '"hostname","username","password","formSubmitURL","httpRealm"',
    '"https://vk.com","vk_user@mail.ru","VkPassword123","https://vk.com/login",""',
    '"https://telegram.org","tg_samar","TgSecretCode","https://telegram.org",""'
  ].join('\r\n');

  const ffImport = pwdStore.importFromCsv(firefoxCsv);
  assert(ffImport.success === true && ffImport.count === 2, 'Should import 2 passwords from Firefox CSV');
  console.log(`  ✓ Successfully imported ${ffImport.count} credentials from Mozilla Firefox CSV format`);

  // 7e. Domain Autofill Matching
  const ytMatches = pwdStore.getByUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert(ytMatches.length >= 1, 'Should find matched password for YouTube');
  assert(ytMatches[0].domain === 'youtube.com');
  console.log(`  ✓ Domain matcher successfully matched URL to "${ytMatches[0].name}" (${ytMatches[0].domain})`);

  const ghMatches = pwdStore.getByUrl('https://github.com/settings/profile');
  assert(ghMatches.length >= 1, 'Should find matched password for GitHub');
  console.log(`  ✓ Domain matcher successfully matched URL to "${ghMatches[0].name}" (${ghMatches[0].domain})`);

  // 7f. Export to CSV
  const exported = pwdStore.exportToCsv();
  assert(exported.includes('name,url,username,password,note'), 'Exported CSV must have header');
  assert(exported.includes('github.com'), 'Exported CSV must contain saved entries');
  console.log('  ✓ Exported passwords back to standard CSV format');

  // 7g. Delete credential
  const delRes = pwdStore.delete(addRes.entry.id);
  assert(delRes.success === true);
  console.log('  ✓ Deleted credential cleanly');

  // 6. Test Browser Importer & Migration Wizard
  console.log('\n[Test 8] Testing Browser Importer (Chrome/Edge/Firefox detection & direct import)...');
  const BrowserImporter = require('../main/browser-importer');
  const importer = new BrowserImporter(store, pwdStore);

  // 8a. Detect installed browsers
  const detected = importer.detectInstalledBrowsers();
  assert(Array.isArray(detected) && detected.length > 0, 'Should detect at least 1 installed browser on this Windows system');
  console.log(`  ✓ Successfully detected ${detected.length} installed browsers on this system:`);
  detected.forEach(b => {
    console.log(`    - ${b.name}: ${b.passwordCount} passwords, ${b.bookmarkCount} bookmarks, ${b.historyCount} history`);
  });

  const chromeDetected = detected.find(b => b.id === 'chrome');
  const edgeDetected = detected.find(b => b.id === 'edge');
  assert(chromeDetected || edgeDetected, 'At least Chrome or Edge must be detected on Windows');

  // 8b. Test Direct Bookmarks Import from Chrome (if installed)
  if (chromeDetected) {
    const prevBookmarksCount = store.getBookmarks().length;
    const bmRes = importer.importBookmarks('chrome');
    assert(bmRes.success === true, 'Importing bookmarks from Chrome should succeed');
    assert(bmRes.count > 0, 'Should have imported bookmarks from Chrome');
    assert(store.getBookmarks().length > prevBookmarksCount, 'Store should reflect newly imported bookmarks');
    console.log(`  ✓ Directly imported ${bmRes.count} bookmarks from Chrome without manual export`);
  }

  // 8c. Test Scan Downloads
  const dlScan = importer.scanDownloadsForPasswords();
  assert(typeof dlScan === 'object', 'Scan downloads should return a result object');
  console.log(`  ✓ Scan Downloads folder executed safely: ${dlScan.message}`);

  // 8d. Test Firefox 1-Click Passwords & Bookmarks Import
  const firefoxDetected = detected.find(b => b.id === 'firefox');
  if (firefoxDetected) {
    console.log('  Testing Firefox 1-Click Passwords Import...');
    importer.importPasswords('firefox').then(ffPwRes => {
      assert(ffPwRes.success === true, 'Firefox password import should succeed');
      assert(ffPwRes.count > 0, 'Firefox should have decrypted passwords');
      console.log(`  ✓ Successfully decrypted and imported ${ffPwRes.count} passwords from Firefox in 1 click!`);

      const ffBmRes = importer.importBookmarks('firefox');
      assert(ffBmRes.success === true, 'Firefox bookmarks import should succeed');
      console.log(`  ✓ Successfully imported ${ffBmRes.count} bookmarks from Firefox places.sqlite!`);

      finishTests();
    }).catch(err => {
      console.error('Firefox test error:', err);
      process.exit(1);
    });
    return;
  }

  finishTests();

  function finishTests() {
    // 7. Test GitHub Auto-Updater
    console.log('\n[Test 9] Testing GitHub Auto-Updater Engine...');
    const GitHubUpdater = require('../main/github-updater');
    const updater = new GitHubUpdater({ currentVersion: '1.0.0' });
    assert(updater.isNewer('1.0.0', '1.0.1') === true, '1.0.1 should be newer than 1.0.0');
    assert(updater.isNewer('1.0.1', '1.0.0') === false, '1.0.0 should not be newer than 1.0.1');
    assert(updater.isNewer('1.0.0', '2.0.0') === true, '2.0.0 should be newer than 1.0.0');
    console.log('  ✓ Verified semver version comparison logic');

    // 8. Test Pinned Tabs Persistence Across Browser Restarts
    console.log('\n[Test 10] Testing Pinned Tabs & Browser State Persistence Across Restarts...');
    const initialTabsState = [
      { id: 'tab_pinned_tw', url: 'https://timeweb.cloud', title: 'TimeWeb Cloud', isPinned: true, spaceId: 'space_general' },
      { id: 'tab_pinned_gh', url: 'https://github.com', title: 'GitHub', isPinned: true, spaceId: 'space_general' },
      { id: 'tab_unpinned', url: 'https://news.ycombinator.com', title: 'Hacker News', isPinned: false, spaceId: 'space_general' }
    ];
    const initialPinnedDock = [
      { id: 'pin_tw', tabId: 'tab_pinned_tw', url: 'https://timeweb.cloud', title: 'TimeWeb Cloud' },
      { id: 'pin_gh', tabId: 'tab_pinned_gh', url: 'https://github.com', title: 'GitHub' }
    ];

    const saveSuccess = store.saveState({
      spaces: [{ id: 'space_general', name: 'Общее' }],
      activeSpaceId: 'space_general',
      pinnedTabs: initialPinnedDock,
      tabs: initialTabsState,
      activeTabId: 'tab_pinned_tw'
    });
    assert(saveSuccess === true, 'ProfileStore should save state successfully');

    // Simulate complete browser restart by creating a new ProfileStore instance from disk
    const restartedStore = new ProfileStore(testStorageDir);
    const restoredState = restartedStore.getState();

    assert(restoredState.pinnedTabs && restoredState.pinnedTabs.length === 2, 'Should restore 2 pinned tabs in dock');
    assert(restoredState.pinnedTabs.some(p => p.url === 'https://timeweb.cloud'), 'Pinned dock must contain TimeWeb Cloud');
    assert(restoredState.tabs && restoredState.tabs.length === 3, 'Should restore tabs array');

    const pinnedInTabs = restoredState.tabs.filter(t => t.isPinned);
    assert(pinnedInTabs.length === 2, 'Should have exactly 2 pinned tabs');
    assert(pinnedInTabs.some(t => t.url === 'https://timeweb.cloud'), 'Pinned tabs must preserve TimeWeb Cloud URL across restart');
    console.log('  ✓ Verified persistent pinned tabs in browser_state.json across simulated browser restart');

    // Simulate unpinning a tab
    const unpinnedTabs = restoredState.tabs.map(t => t.url === 'https://timeweb.cloud' ? { ...t, isPinned: false } : t);
    const updatedPinnedDock = restoredState.pinnedTabs.filter(p => p.url !== 'https://timeweb.cloud');
    restartedStore.saveState({
      ...restoredState,
      pinnedTabs: updatedPinnedDock,
      tabs: unpinnedTabs
    });

    const secondRestartStore = new ProfileStore(testStorageDir);
    const secondRestoredState = secondRestartStore.getState();
    assert(secondRestoredState.pinnedTabs.length === 1, 'Dock should now have 1 pin after unpin');
    assert(!secondRestoredState.pinnedTabs.some(p => p.url === 'https://timeweb.cloud'), 'TimeWeb should be removed from pinned dock');
    const secondPinnedInTabs = secondRestoredState.tabs.filter(t => t.isPinned);
    assert(secondPinnedInTabs.length === 1, 'Tabs array should now have only 1 pinned tab');
    console.log('  ✓ Verified unpinning synchronization and persistent disk update');

    // Cleanup temp dir
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }

    console.log('\n==========================================');
    console.log('🎉 ALL INTEGRATION TESTS PASSED 100%!');
    console.log('==========================================');
    process.exit(0);
  }
}).catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
