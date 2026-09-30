"""Real-browser smoke tests. Run this file directly; see README.md beside it."""
import argparse
from contextlib import contextmanager
import os
from pathlib import Path
import socket
import struct
import subprocess
import tempfile
import time
import unittest
from urllib.error import URLError
from urllib.parse import urlparse
from urllib.request import urlopen
import uuid
import zlib

from selenium import webdriver
from selenium.common.exceptions import ElementClickInterceptedException, StaleElementReferenceException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS = Path(__file__).resolve().parent / 'artifacts'
CONFIG = None


def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


@contextmanager
def application():
    """Launch the actual app with disposable storage, or use an explicit URL."""
    if CONFIG.base_url:
        yield CONFIG.base_url.rstrip('/')
        return
    ARTIFACTS.mkdir(exist_ok=True)
    processes = []
    logs = []
    with tempfile.TemporaryDirectory(prefix='vaultchain-selenium-') as directory:
        api_port, client_port = free_port(), free_port()
        while api_port == client_port:
            client_port = free_port()
        env = dict(os.environ, PORT=str(api_port),
                   DATABASE_PATH=f'{directory}/test.sqlite',
                   UPLOAD_DIRECTORY=f'{directory}/uploads',
                   CHECK_UPLOAD_DIRECTORY=f'{directory}/checks',
                   DOCUMENT_UPLOAD_DIRECTORY=f'{directory}/documents',
                   JWT_SECRET=uuid.uuid4().hex,
                   VITE_API_URL=f'http://127.0.0.1:{api_port}/api')
        commands = [
            ('server', ['node', 'src/server.js'], ROOT / 'server',
             f'http://127.0.0.1:{api_port}/api/health'),
            ('client', ['node', str(ROOT / 'node_modules/vite/bin/vite.js'),
                        '--host', '127.0.0.1', '--port', str(client_port), '--strictPort'],
             ROOT / 'client', f'http://127.0.0.1:{client_port}'),
        ]
        try:
            for name, command, cwd, url in commands:
                log = (ARTIFACTS / f'{name}.log').open('w')
                logs.append(log)
                process = subprocess.Popen(command, cwd=cwd, env=env,
                                           stdout=log, stderr=subprocess.STDOUT)
                processes.append(process)
                deadline = time.monotonic() + 45
                while True:
                    if process.poll() is not None:
                        raise RuntimeError(f'{name} exited; see {ARTIFACTS / (name + ".log")}')
                    try:
                        with urlopen(url, timeout=1) as response:
                            if response.status == 200:
                                break
                    except (URLError, TimeoutError):
                        pass
                    if time.monotonic() > deadline:
                        raise RuntimeError(f'{name} did not become ready; see {ARTIFACTS}')
                    time.sleep(0.2)
            yield f'http://127.0.0.1:{client_port}'
        finally:
            for process in reversed(processes):
                if process.poll() is None:
                    process.terminate()
                    try:
                        process.wait(timeout=10)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait()
            for log in logs:
                log.close()


def make_png(path):
    """Generate a unique valid RGB PNG without another imaging dependency."""
    def chunk(kind, data):
        return (struct.pack('!I', len(data)) + kind + data
                + struct.pack('!I', zlib.crc32(kind + data) & 0xffffffff))
    pixels = b''.join(b'\x00' + os.urandom(64 * 3) for _ in range(64))
    path.write_bytes(b'\x89PNG\r\n\x1a\n'
                     + chunk(b'IHDR', struct.pack('!2I5B', 64, 64, 8, 2, 0, 0, 0))
                     + chunk(b'IDAT', zlib.compress(pixels)) + chunk(b'IEND', b''))


class FailureArtifacts(unittest.TextTestResult):
    def capture(self, test):
        driver = getattr(test, 'driver', None)
        if driver:
            ARTIFACTS.mkdir(exist_ok=True)
            stem = ARTIFACTS / test._testMethodName
            try:
                driver.save_screenshot(str(stem.with_suffix('.png')))
                stem.with_suffix('.html').write_text(driver.page_source, encoding='utf-8')
            except Exception as error:
                self.stream.writeln(f'Could not save failure artifacts: {error}')

    def addFailure(self, test, err):
        self.capture(test)
        super().addFailure(test, err)

    def addError(self, test, err):
        self.capture(test)
        super().addError(test, err)


class VaultChainTests(unittest.TestCase):
    base_url = ''

    def setUp(self):
        options = webdriver.ChromeOptions()
        if not CONFIG.headed:
            options.add_argument('--headless=new')
        options.add_argument('--window-size=1440,1000')
        options.add_argument('--disable-dev-shm-usage')
        if CONFIG.chrome_binary:
            options.binary_location = CONFIG.chrome_binary
        self.driver = webdriver.Chrome(options=options)
        self.addCleanup(self.driver.quit)
        self.driver.set_page_load_timeout(30)
        self.wait = WebDriverWait(self.driver, CONFIG.timeout)

    def visible(self, css):
        return self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, css)))

    def click(self, css):
        def attempt(driver):
            element = EC.element_to_be_clickable((By.CSS_SELECTOR, css))(driver)
            if not element:
                return False
            driver.execute_script(
                "arguments[0].scrollIntoView({block: 'center', behavior: 'instant'});", element)
            try:
                element.click()
                return True
            except (ElementClickInterceptedException, StaleElementReferenceException):
                return False
        self.wait.until(attempt)

    def fill(self, css, value):
        element = self.visible(css)
        element.clear()
        element.send_keys(value)

    def path_is(self, path):
        self.wait.until(lambda driver: urlparse(driver.current_url).path == path)

    def register(self):
        self.email = f'selenium-{uuid.uuid4().hex}@example.com'
        self.password = 'Selenium-Test-Password-42!'
        self.driver.get(self.base_url + '/register')
        self.fill('#register-name', 'Selenium Tester')
        self.fill('#register-email', self.email)
        self.fill('#register-password', self.password)
        self.click('button[type="submit"]')
        self.path_is('/dashboard')
        self.visible('.topbar__profile')

    def test_protected_routes_require_login(self):
        for path in ['/dashboard', '/assets', '/documents', '/vault', '/wallet', '/marketplace']:
            self.driver.get(self.base_url + path)
            self.path_is('/login')
            self.visible('#login-email')

    def test_authentication_validation(self):
        self.driver.get(self.base_url + '/login')
        self.click('button[type="submit"]')
        self.assertEqual(self.visible('[role="alert"]').text,
                         'Enter your username or email and password to continue.')
        self.driver.get(self.base_url + '/register')
        self.fill('#register-name', 'Selenium Tester')
        self.fill('#register-email', f'selenium-{uuid.uuid4().hex}@example.com')
        self.fill('#register-password', 'short')
        self.click('button[type="submit"]')
        self.assertEqual(self.visible('[role="alert"]').text,
                         'Password must be at least 8 characters long.')
        self.path_is('/register')

    def test_registration_navigation_logout_and_login(self):
        self.register()
        for route, heading in [('/assets', 'Digital assets'), ('/documents', 'Documents'),
                               ('/vault', 'Vaults'), ('/wallet', 'Wallet'),
                               ('/marketplace', 'Marketplace'),
                               ('/verification', 'Verification Center')]:
            self.click(f'.sidebar a[href="{route}"]')
            self.path_is(route)
            self.wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR, 'h1'), heading))
        self.wait.until(EC.element_to_be_clickable(
            (By.XPATH, '//button[normalize-space()="Log out"]'))).click()
        self.path_is('/login')
        self.driver.get(self.base_url + '/assets')
        self.path_is('/login')
        self.fill('#login-email', self.email)
        self.fill('#login-password', self.password)
        self.click('button[type="submit"]')
        self.path_is('/assets')
        self.visible('.topbar__profile')
        self.driver.refresh()
        self.visible('.topbar__profile')
        self.path_is('/assets')

    def test_upload_fingerprint_search_and_duplicate_rejection(self):
        self.register()
        with tempfile.TemporaryDirectory() as directory:
            image = Path(directory) / 'selenium-image.png'
            make_png(image)
            title = f'Selenium Asset {uuid.uuid4().hex[:10]}'
            self.driver.get(self.base_url + '/upload')
            self.wait.until(EC.presence_of_element_located(
                (By.CSS_SELECTOR, 'input[type="file"]'))).send_keys(str(image))
            self.fill('#upload-title', title)
            self.click('.upload-page-form button[type="submit"]')
            fingerprint = self.visible('.upload-result-card code').text
            self.assertRegex(fingerprint, r'^[0-9a-fA-F]{64}$')
            self.click('.sidebar a[href="/assets"]')
            self.fill('input[placeholder="Search assets by title, filename, or ID"]', title)
            self.wait.until(EC.text_to_be_present_in_element(
                (By.CSS_SELECTOR, '.asset-card h3'), title))
            self.fill('input[placeholder="Search assets by title, filename, or ID"]', uuid.uuid4().hex)
            self.wait.until(EC.visibility_of_element_located(
                (By.XPATH, '//h3[normalize-space()="No matching assets"]')))
            self.driver.get(self.base_url + '/upload')
            self.wait.until(EC.presence_of_element_located(
                (By.CSS_SELECTOR, 'input[type="file"]'))).send_keys(str(image))
            self.click('.upload-page-form button[type="submit"]')
            error = self.visible('.upload-page-form .error-banner').text.lower()
            self.assertRegex(error, r'duplicate|already')
            self.assertFalse(self.driver.find_elements(By.CSS_SELECTOR, '.upload-result-card'))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', help='Use an existing test app; leaves created accounts/assets there')
    parser.add_argument('--headed', action='store_true', help='Show the Chrome window')
    parser.add_argument('--chrome-binary', help='Optional path to Chrome/Chromium')
    parser.add_argument('--timeout', type=float, default=30, help='Explicit wait timeout in seconds')
    CONFIG = parser.parse_args()
    with application() as base_url:
        VaultChainTests.base_url = base_url
        suite = unittest.defaultTestLoader.loadTestsFromTestCase(VaultChainTests)
        result = unittest.TextTestRunner(verbosity=2, resultclass=FailureArtifacts).run(suite)
    raise SystemExit(0 if result.wasSuccessful() else 1)
