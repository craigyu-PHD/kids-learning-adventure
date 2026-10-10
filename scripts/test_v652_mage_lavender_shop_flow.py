#!/usr/bin/env python3
"""Negative controls for the two-hat runner; no project assets or family data."""
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import threading
import unittest
from unittest.mock import Mock, patch
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright
from qa_v652_mage_lavender_shop_flow import (
    assert_page_health, assert_runtime_errors, page_health, verify_served_assets, sha_file, pin_reviewed_source,
)


class RunnerControls(unittest.TestCase):
    def test_dataless_file_rejected_without_reading(self):
        path = Mock()
        path.stat.return_value.st_size = 6213092
        path.stat.return_value.st_blocks = 8
        path.stat.return_value.st_flags = 0x40000060
        with self.assertRaises(RuntimeError):
            sha_file(path)
        path.read_bytes.assert_not_called()

    def test_reviewed_source_drift_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'source.png'
            source.write_bytes(b'accepted source bytes')
            record = {'path': 'source.png', 'sha256': hashlib.sha256(source.read_bytes()).hexdigest()}
            with patch('qa_v652_mage_lavender_shop_flow.ROOT', root):
                pins = {}
                pin_reviewed_source(record, pins)
                self.assertEqual(pins['source.png'], record['sha256'])
                source.write_bytes(b'changed after review')
                with self.assertRaises(AssertionError):
                    pin_reviewed_source(record, {})

    def test_clean_page(self):
        assert_page_health({'overflow': 0, 'brokenImages': []})

    def test_one_pixel_overflow_rejected(self):
        with self.assertRaises(AssertionError):
            assert_page_health({'overflow': 1, 'brokenImages': []})

    def test_broken_image_rejected(self):
        with self.assertRaises(AssertionError):
            assert_page_health({'overflow': 0, 'brokenImages': [{'src': '/missing.png'}]})

    def test_application_console_error_rejected(self):
        with self.assertRaises(AssertionError):
            assert_runtime_errors([{'text': 'State update failed', 'url': ''}], [], [], [])

    def test_only_exact_external_abort_is_expected(self):
        url = 'https://example.invalid/font.woff2'
        assert_runtime_errors([{'text': 'Failed to load resource: net::ERR_FAILED', 'url': url}], [url], [], [])
        with self.assertRaises(AssertionError):
            assert_runtime_errors([{'text': 'State update failed', 'url': url}], [url], [], [])

    def test_local_abort_rejected(self):
        with self.assertRaises(AssertionError):
            assert_runtime_errors([{'text': 'Failed to load resource: net::ERR_FAILED', 'url': 'http://127.0.0.1/missing.png'}], [], [], [])

    def test_family_api_attempt_rejected_even_when_blocked(self):
        with self.assertRaises(AssertionError):
            assert_runtime_errors([], [], ['http://127.0.0.1/api/state'], [])

    def test_local_http_error_rejected(self):
        with self.assertRaises(AssertionError):
            assert_runtime_errors([], [], [], [{'url': '/missing.png', 'status': 404}])


class BrowserAndHTTPControls(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch(headless=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()

    def test_real_dom_overflow_and_broken_decode(self):
        page = self.browser.new_page(viewport={'width': 390, 'height': 844})
        try:
            page.set_content('<style>body{margin:0}</style><div>Healthy fixture</div>')
            page_health(page)
            page.set_content('<style>body{margin:0}</style><div style="width:391px">Overflow</div>')
            with self.assertRaises(AssertionError):
                page_health(page)
            page.set_content('<img src="data:image/png;base64,broken">')
            page.wait_for_function('document.images[0].complete')
            with self.assertRaises(AssertionError):
                page_health(page)
        finally:
            page.close()

    def test_actual_http_bytes_stale_and_redirect(self):
        payload = b'isolated QA bytes, not an image or production asset'
        pins = {f'public/assets/control-{i}.bin': hashlib.sha256(payload).hexdigest() for i in range(18)}

        class Handler(BaseHTTPRequestHandler):
            mode = 'valid'

            def do_GET(self):
                if self.mode == 'redirect':
                    self.send_response(302)
                    self.send_header('Location', 'https://example.invalid/')
                    self.end_headers()
                    return
                self.send_response(200)
                self.end_headers()
                self.wfile.write(payload if self.mode == 'valid' else b'stale preview bytes')

            def log_message(self, *_):
                pass

        server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        context = self.browser.new_context()
        try:
            url = f'http://127.0.0.1:{server.server_port}/'
            self.assertEqual(len(verify_served_assets(context, url, pins)), 18)
            for mode in ('stale', 'redirect'):
                Handler.mode = mode
                with self.assertRaises(AssertionError):
                    verify_served_assets(context, url, pins)
        finally:
            context.close()
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)


if __name__ == '__main__':
    unittest.main(verbosity=2)
