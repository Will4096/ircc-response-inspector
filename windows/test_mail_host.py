"""Offline host checks: fake IMAP data only; no real email or account access."""
import importlib.util
import io
import json
import os
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('mail_host', Path(__file__).with_name('mail_host.py'))
host = importlib.util.module_from_spec(spec)
spec.loader.exec_module(host)


class HostTests(unittest.TestCase):
    def test_imap_date_keeps_previous_calendar_day_at_utc_midnight(self):
        import datetime as dt
        submitted = dt.datetime(2026, 10, 31, 0, 31, tzinfo=dt.timezone.utc).timestamp() * 1000
        self.assertEqual(host.search_date(submitted, dt.timezone(dt.timedelta(hours=-7))), '30-Oct-2026')
        self.assertEqual(host.search_date(submitted, dt.timezone(dt.timedelta(hours=8))), '31-Oct-2026')
        # The same delivery can be dated Oct 30 in UTC-7 despite being Oct 31 UTC.
        raw = b'1 (INTERNALDATE "30-Oct-2026 17:31:01 -0700" RFC822.SIZE 100)'
        self.assertGreater(host.internal_time(raw), submitted)

    def test_poll_falls_back_to_bounded_headers_and_keeps_exact_filters(self):
        from unittest.mock import Mock
        import datetime as dt
        now = dt.datetime.now(dt.timezone.utc)
        since = now.timestamp() * 1000 - 2000
        calls = []
        sender = 'notice@notification.canada.ca'
        raw = f'From: {sender}\r\nTo: example@163.com\r\nSubject: IRCC Tracker verification code\r\n\r\nYour verification code is 123456.'.encode()
        def uid(command, *args):
            calls.append((command, args))
            if command == 'search':
                return ('OK', [b'' if 'OR' in args else b'1 2 3'])
            number, fields = args
            if fields == '(BODY.PEEK[])':
                self.assertEqual(number, b'3', 'Never fetch old or unrelated message bodies')
                return ('OK', [(b'3', raw)])
            received = now - dt.timedelta(seconds=10) if number == b'1' else now
            stamp = received.strftime('%d-%b-%Y %H:%M:%S +0000')
            headers = b'From: other@example.invalid\r\n' if number == b'2' else raw.split(b'\r\n\r\n')[0]
            return ('OK', [(f'1 (INTERNALDATE "{stamp}" RFC822.SIZE 200)'.encode(), headers)])
        client = Mock();client.uid.side_effect = uid
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as directory:
            secret = Path(directory) / 'fake.dpapi';secret.write_bytes(b'opaque-test')
            credentials = json.dumps({'email': 'example@163.com', 'password': 'synthetic-secret'}).encode()
            with patch.object(host, 'SECRET', secret), patch.object(host, 'protect', return_value=credentials), patch.object(host, 'connect', return_value=client), patch.object(host, 'diagnostic'):
                result = host.handle({'action': 'poll', 'email': 'example@163.com', 'since': since})
        self.assertEqual(len(result['messages']), 1)
        self.assertEqual(result['messages'][0]['id'], '3')
        self.assertEqual(calls[0], ('search', (None, 'SINCE', host.search_date(since))))
        client.logout.assert_called_once()

    def test_diagnostic_contains_only_fixed_stages_and_counts(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as directory:
            with patch.object(host, 'ROOT', Path(directory)):
                host.diagnostic('secret@example.invalid')
                host.diagnostic('search_ok', 2)
                host.diagnostic('mail.network', 'synthetic-secret')
            events = [json.loads(line) for line in (Path(directory) / 'diagnostic.log').read_text().splitlines()]
            self.assertEqual(len(events), 2)
            self.assertEqual(events[0]['count'], 2)
            self.assertNotIn('count', events[1])
            self.assertNotIn('secret', json.dumps(events))

    def test_partial_frame(self):
        self.assertEqual(host.read_exact(io.BytesIO(b'abcd'), 4), b'abcd')
        self.assertIsNone(host.read_exact(io.BytesIO(b'ab'), 4))

    def test_message_decode(self):
        raw = b'From: IRCC <notice@cic.gc.ca>\r\nTo: test@163.com\r\nSubject: Application status tracker verification code\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nYour verification code is 123456.'
        result = host.extract_message('1', raw, 1000)
        self.assertEqual(result['to'], ['test@163.com'])
        self.assertEqual(result['receivedAt'], 1000)
        self.assertIn('123456', result['text'])

    def test_reject_other_hosts_and_stale_poll(self):
        with self.assertRaises(ValueError):
            host.account('x@evil.example')
        with self.assertRaises(ValueError):
            host.handle({'action': 'poll', 'email': 'x@163.com', 'since': 0})
        with self.assertRaises(ValueError):
            host.handle({'action': 'send'})

    def test_html_only_message_is_text_without_loading_resources(self):
        raw = b'From: notice@cic.gc.ca\r\nTo: test@163.com\r\nSubject: Application status tracker\r\nContent-Type: text/html; charset=utf-8\r\n\r\n<head><style>654321</style></head><p>Your verification code is <b>123456</b>.</p><img src="https://example.invalid/pixel"><script>999999</script>'
        result = host.extract_message('html', raw, 1000)
        self.assertIn('123456', result['text'])
        self.assertNotIn('654321', result['text'])
        self.assertNotIn('999999', result['text'])
        self.assertNotIn('example.invalid', result['text'])

    @unittest.skipUnless(sys.platform == 'win32', 'Windows DPAPI')
    def test_dpapi_roundtrip(self):
        secret = b'synthetic-test-secret-only'
        encrypted = host.protect(secret)
        self.assertNotIn(secret, encrypted)
        self.assertEqual(host.protect(encrypted, decrypt=True), secret)

    def test_clear_uses_only_private_credential_file(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as directory:
            secret = Path(directory) / 'test.dpapi'
            secret.write_bytes(b'fake')
            with patch.object(host, 'SECRET', secret):
                self.assertTrue(host.handle({'action': 'clear'})['ok'])
            self.assertFalse(secret.exists())

    def test_reconnect_checks_login_without_reading_mail(self):
        from unittest.mock import Mock
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as directory:
            secret = Path(directory) / 'test.dpapi'
            secret.write_bytes(b'fake-encrypted')
            client = Mock()
            credentials = json.dumps({'email': 'example@163.com', 'password': 'synthetic-password'}).encode()
            with patch.object(host, 'SECRET', secret), patch.object(host, 'protect', return_value=credentials), patch.object(host, 'connect', return_value=client):
                self.assertTrue(host.handle({'action': 'test', 'email': 'example@163.com'})['ok'])
            client.logout.assert_called_once()
            client.uid.assert_not_called()

    @unittest.skipUnless(sys.platform == 'win32', 'Windows binary framing')
    def test_native_frame(self):
        body = json.dumps({'action': 'status'}).encode()
        result = subprocess.run([sys.executable, '-I', str(Path(__file__).with_name('mail_host.py'))], input=struct.pack('<I', len(body)) + body, capture_output=True, timeout=10, check=True)
        size = struct.unpack('<I', result.stdout[:4])[0]
        parsed = json.loads(result.stdout[4:])
        self.assertEqual(size, len(result.stdout) - 4)
        self.assertTrue(parsed['ok'])
        self.assertEqual(result.stderr, b'')

    @unittest.skipUnless(os.environ.get('IRCC_TEST_LAUNCHER'), 'Launcher test is run via test-installer.ps1')
    def test_compiled_launcher(self):
        body = json.dumps({'action': 'status'}).encode()
        result = subprocess.run([os.environ['IRCC_TEST_LAUNCHER']], input=struct.pack('<I', len(body)) + body, capture_output=True, timeout=10, check=True)
        self.assertEqual(struct.unpack('<I', result.stdout[:4])[0], len(result.stdout) - 4)
        self.assertTrue(json.loads(result.stdout[4:])['ok'])
        self.assertEqual(result.stderr, b'')


if __name__ == '__main__':
    unittest.main()
