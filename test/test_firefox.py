import sqlite3
import os
import shutil

local = os.environ.get('LOCALAPPDATA', '')
chrome_login = os.path.join(local, 'Google', 'Chrome', 'User Data', 'Default', 'Login Data')
if os.path.exists(chrome_login):
    shutil.copyfile(chrome_login, 'temp_chrome.db')
    conn = sqlite3.connect('temp_chrome.db')
    c = conn.cursor()
    c.execute("SELECT password_value FROM logins WHERE password_value IS NOT NULL AND length(password_value) > 0")
    rows = c.fetchall()
    conn.close()
    os.remove('temp_chrome.db')
    
    prefixes = {}
    for r in rows:
        val = r[0]
        if len(val) >= 3:
            pfx = val[:3].decode('latin1', errors='ignore')
            prefixes[pfx] = prefixes.get(pfx, 0) + 1
        else:
            prefixes['short'] = prefixes.get('short', 0) + 1
    print("Prefixes in Chrome Login Data:", prefixes)

