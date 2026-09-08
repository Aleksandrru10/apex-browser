import os
import sys
import json
import base64
import ctypes as ct

# Ensure UTF-8 output on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')


class SECItem(ct.Structure):
    _fields_ = [
        ('type', ct.c_uint),
        ('data', ct.c_void_p),
        ('len', ct.c_uint)
    ]

def find_nss_dir():
    candidates = [
        r'C:\Program Files\Mozilla Firefox',
        r'C:\Program Files (x86)\Mozilla Firefox',
        os.path.expanduser(r'~\AppData\Local\Mozilla Firefox')
    ]
    for c in candidates:
        if os.path.exists(os.path.join(c, 'nss3.dll')):
            return c
    return None

def decrypt_firefox(profile_path):
    nss_dir = find_nss_dir()
    if not nss_dir:
        return {'success': False, 'error': 'Firefox NSS library (nss3.dll) not found'}

    old_cwd = os.getcwd()
    try:
        if hasattr(os, 'add_dll_directory'):
            os.add_dll_directory(nss_dir)
        os.chdir(nss_dir)
        nss = ct.CDLL(os.path.join(nss_dir, 'nss3.dll'))
    except Exception as e:
        os.chdir(old_cwd)
        return {'success': False, 'error': f'Failed to load nss3.dll: {e}'}

    # Setup NSS signatures
    nss.NSS_Init.argtypes = [ct.c_char_p]
    nss.NSS_Init.restype = ct.c_int

    nss.NSS_Shutdown.argtypes = []
    nss.NSS_Shutdown.restype = ct.c_int

    nss.PK11_GetInternalKeySlot.argtypes = []
    nss.PK11_GetInternalKeySlot.restype = ct.c_void_p

    nss.PK11_FreeSlot.argtypes = [ct.c_void_p]
    nss.PK11_FreeSlot.restype = None

    nss.PK11_Authenticate.argtypes = [ct.c_void_p, ct.c_int, ct.c_void_p]
    nss.PK11_Authenticate.restype = ct.c_int

    nss.PK11SDR_Decrypt.argtypes = [ct.POINTER(SECItem), ct.POINTER(SECItem), ct.c_void_p]
    nss.PK11SDR_Decrypt.restype = ct.c_int

    nss.SECITEM_ZfreeItem.argtypes = [ct.POINTER(SECItem), ct.c_int]
    nss.SECITEM_ZfreeItem.restype = None

    # Initialize NSS with profile
    profile_bytes = profile_path.encode('utf-8')
    if nss.NSS_Init(profile_bytes) != 0:
        os.chdir(old_cwd)
        return {'success': False, 'error': 'NSS_Init failed'}

    slot = nss.PK11_GetInternalKeySlot()
    if not slot:
        nss.NSS_Shutdown()
        os.chdir(old_cwd)
        return {'success': False, 'error': 'PK11_GetInternalKeySlot failed'}

    # Authenticate (default blank master password)
    nss.PK11_Authenticate(slot, 1, None)

    logins_file = os.path.join(profile_path, 'logins.json')
    if not os.path.exists(logins_file):
        nss.PK11_FreeSlot(slot)
        nss.NSS_Shutdown()
        os.chdir(old_cwd)
        return {'success': False, 'error': 'logins.json not found in profile'}

    try:
        with open(logins_file, 'r', encoding='utf-8') as f:
            logins_data = json.load(f)
    except Exception as e:
        nss.PK11_FreeSlot(slot)
        nss.NSS_Shutdown()
        os.chdir(old_cwd)
        return {'success': False, 'error': f'Failed to read logins.json: {e}'}

    results = []

    def decrypt_value(b64_cipher):
        if not b64_cipher:
            return ''
        try:
            raw = base64.b64decode(b64_cipher)
            buf = ct.create_string_buffer(raw)
            item_in = SECItem(0, ct.cast(buf, ct.c_void_p), len(raw))
            item_out = SECItem(0, None, 0)
            res = nss.PK11SDR_Decrypt(ct.byref(item_in), ct.byref(item_out), None)
            if res == 0 and item_out.data:
                decrypted = ct.string_at(item_out.data, item_out.len).decode('utf-8', errors='replace')
                nss.SECITEM_ZfreeItem(ct.byref(item_out), 0)
                return decrypted
        except Exception:
            pass
        return ''

    for entry in logins_data.get('logins', []):
        url = entry.get('hostname', '')
        u_b64 = entry.get('encryptedUsername', '')
        p_b64 = entry.get('encryptedPassword', '')

        user = decrypt_value(u_b64)
        pwd = decrypt_value(p_b64)

        if url and (user or pwd):
            results.append({
                'url': url,
                'username': user,
                'password': pwd
            })

    nss.PK11_FreeSlot(slot)
    nss.NSS_Shutdown()
    os.chdir(old_cwd)

    return {'success': True, 'count': len(results), 'logins': results}

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'Usage: python firefox-decrypt.py <profile_dir>'}))
        sys.exit(1)

    profile_dir = sys.argv[1]
    res = decrypt_firefox(profile_dir)
    print(json.dumps(res, ensure_ascii=False))
