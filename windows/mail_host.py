"""Windows-only Native Messaging host. Standard library; no HTTP listener or telemetry."""
import ctypes
from ctypes import wintypes
import datetime as dt
import email
from email import policy
from email.utils import getaddresses
import imaplib
import json
import os
from pathlib import Path
import re
import ssl
import struct
import sys

MAX_MESSAGE = 262144
ROOT = Path(os.environ.get('LOCALAPPDATA', '.')) / 'IRCCMailHelper'
SECRET = ROOT / 'mailbox.dpapi'


def protect(data, decrypt=False):
    if sys.platform != 'win32':
        raise ValueError('mail.windows')
    class Blob(ctypes.Structure):
        _fields_ = [('size', wintypes.DWORD), ('data', ctypes.POINTER(ctypes.c_ubyte))]
    buffer = ctypes.create_string_buffer(data)
    source = Blob(len(data), ctypes.cast(buffer, ctypes.POINTER(ctypes.c_ubyte)))
    target = Blob()
    crypt = ctypes.windll.crypt32
    if decrypt:
        ok = crypt.CryptUnprotectData(ctypes.byref(source), None, None, None, None, 1, ctypes.byref(target))
    else:
        ok = crypt.CryptProtectData(ctypes.byref(source), 'IRCC mailbox', None, None, None, 1, ctypes.byref(target))
    if not ok:
        raise ValueError('mail.credentials')
    try:
        return ctypes.string_at(target.data, target.size)
    finally:
        ctypes.windll.kernel32.LocalFree(target.data)


def account(value):
    value = str(value or '').strip().lower()
    if not re.fullmatch(r'[^\s@]+@163\.com', value):
        raise ValueError('mail.config')
    return value


def connect(address, password):
    # Fixed endpoint, certificate verification on. No arbitrary host/port input.
    client = imaplib.IMAP4_SSL('imap.163.com', 993, ssl_context=ssl.create_default_context(), timeout=12)
    try:
        client.login(address, password)
        # NetEase may require the standardized IMAP ID extension for third-party clients.
        if b'ID' in [c.upper() if isinstance(c, bytes) else c.upper().encode() for c in client.capabilities]:
            if 'ID' not in imaplib.Commands:
                imaplib.Commands['ID'] = ('AUTH', 'SELECTED')
            client._simple_command('ID', '("name" "IRCCMailHelper" "version" "1.0")')
        if client.select('INBOX', readonly=True)[0] != 'OK':
            raise ValueError('mail.credentials')
        return client
    except Exception:
        try:
            client.logout()
        except Exception:
            pass
        raise


def logout(client):
    try:
        client.logout()
    except Exception:
        pass


def extract_message(uid, raw, received_at):
    message = email.message_from_bytes(raw, policy=policy.default)
    texts = []
    # Never render HTML, fetch remote images, or read attachments.
    for part in message.walk():
        if part.get_content_type() != 'text/plain' or part.get_content_disposition() == 'attachment':
            continue
        try:
            texts.append(part.get_content()[:64000])
        except (LookupError, UnicodeError):
            continue
    recipients = [v.lower() for _, v in getaddresses(message.get_all('To', []) + message.get_all('Delivered-To', []))]
    return {'id': str(uid), 'receivedAt': received_at, 'from': str(message.get('From', ''))[:200],
            'to': recipients, 'subject': str(message.get('Subject', ''))[:500], 'text': '\n'.join(texts)[:64000]}


def internal_time(metadata):
    parsed = imaplib.Internaldate2tuple(metadata)
    # Internaldate2tuple is local time; timestamp handles the local UTC offset.
    if parsed is None:
        return None
    import time
    return time.mktime(parsed) * 1000


def handle(request):
    action = request.get('action')
    if action == 'status':
        return {'ok': True, 'version': '1.0', 'configured': SECRET.exists()}
    if action == 'clear':
        SECRET.unlink(missing_ok=True)
        return {'ok': True}
    if action == 'configure':
        address = account(request.get('email'))
        password = request.get('password')
        if not isinstance(password, str) or not 8 <= len(password) <= 256 or '\n' in password or '\r' in password:
            raise ValueError('mail.secret')
        client = connect(address, password)
        logout(client)
        ROOT.mkdir(parents=True, exist_ok=True)
        encrypted = protect(json.dumps({'email': address, 'password': password}).encode())
        temporary = SECRET.with_suffix('.tmp')
        temporary.write_bytes(encrypted)
        os.replace(temporary, SECRET)
        return {'ok': True}
    if action != 'poll':
        raise ValueError('mail.permission')
    address = account(request.get('email'))
    since = float(request.get('since', 0))
    now = dt.datetime.now(dt.timezone.utc).timestamp() * 1000
    if not now - 300000 <= since <= now + 60000:
        raise ValueError('mail.stale')
    if not SECRET.exists():
        raise ValueError('mail.credentials')
    credentials = json.loads(protect(SECRET.read_bytes(), decrypt=True))
    if credentials['email'] != address:
        raise ValueError('mail.account')
    client = connect(address, credentials['password'])
    messages = []
    try:
        date = dt.datetime.fromtimestamp(since / 1000, dt.timezone.utc).strftime('%d-%b-%Y')
        # Server-side sender/date filter, not a whole-mailbox download.
        status, data = client.uid('search', None, 'SINCE', date, 'OR', 'FROM', 'cic.gc.ca', 'FROM', 'canada.ca')
        if status != 'OK':
            raise ValueError('mail.network')
        for uid in (data[0] or b'').split()[-10:]:
            status, result = client.uid('fetch', uid, '(INTERNALDATE RFC822.SIZE BODY.PEEK[HEADER.FIELDS (FROM TO DELIVERED-TO SUBJECT)])')
            if status != 'OK':
                continue
            tuples = [v for v in result if isinstance(v, tuple)]
            if not tuples:
                continue
            metadata, headers = tuples[0]
            received = internal_time(metadata)
            size = re.search(rb'RFC822\.SIZE\s+(\d+)', metadata)
            if received is None or received < since or not size or int(size[1]) > 131072:
                continue
            parsed = email.message_from_bytes(headers, policy=policy.default)
            senders = getaddresses(parsed.get_all('From', []))
            if not any(re.search(r'@(?:[a-z0-9-]+\.)*(?:cic\.gc\.ca|canada\.ca)$', v, re.I) for _, v in senders):
                continue
            status, result = client.uid('fetch', uid, '(BODY.PEEK[])')
            if status == 'OK':
                body = next((v[1] for v in result if isinstance(v, tuple)), b'')
                messages.append(extract_message(uid.decode('ascii'), body, received))
        return {'messages': messages}
    finally:
        logout(client)


def read_exact(stream, size):
    chunks = []
    while size:
        chunk = stream.read(size)
        if not chunk:
            return None
        chunks.append(chunk)
        size -= len(chunk)
    return b''.join(chunks)


def main():
    if sys.platform != 'win32':
        return
    import msvcrt
    msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
    msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)
    header = read_exact(sys.stdin.buffer, 4)
    if header is None:
        return
    length = struct.unpack('<I', header)[0]
    if not 0 < length <= MAX_MESSAGE:
        return
    try:
        raw = read_exact(sys.stdin.buffer, length)
        result = handle(json.loads(raw))
    except imaplib.IMAP4.error:
        result = {'error': 'mail.credentials'}
    except ValueError as error:
        result = {'error': str(error) if str(error).startswith('mail.') else 'mail.network'}
    except Exception:
        # Never expose exception strings (which can contain credentials or body text).
        result = {'error': 'mail.network'}
    output = json.dumps(result, ensure_ascii=False).encode('utf-8')
    if len(output) > 1000000:
        output = b'{"error":"mail.network"}'
    sys.stdout.buffer.write(struct.pack('<I', len(output)) + output)
    sys.stdout.buffer.flush()


if __name__ == '__main__':
    main()
