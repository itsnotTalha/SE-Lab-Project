"""Workspace regression checks. Run directly, like test_vaultchain.py."""
import argparse
import unittest
import uuid

from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
import test_vaultchain as smoke


class WorkspaceTests(smoke.VaultChainTests):
    def select_workspace(self, text):
        self.click('.ws-trigger')
        self.wait.until(EC.element_to_be_clickable(
            (By.XPATH, f'//button[contains(@class,"ws-option")][.//strong[text()="{text}"]]'))).click()

    def test_workspace_routes_and_keyboard(self):
        self.register()
        self.select_workspace('CyberShield Security Labs')
        self.path_is('/organizations/org-1/overview')
        self.assertEqual(self.visible('h1').text, 'CyberShield Security Labs')
        for section in ['inventory', 'contributors', 'vaults', 'treasury', 'revenue']:
            self.click(f'.sidebar a[href="/organizations/org-1/{section}"]')
            self.path_is(f'/organizations/org-1/{section}')
            self.visible('h1')
            active = self.driver.find_elements(By.CSS_SELECTOR, '.sidebar__nav a[aria-current="page"]')
            self.assertEqual(len(active), 1)
        self.driver.refresh()
        self.visible('.workspace-context')
        self.assertIn('CyberShield', self.visible('.ws-trigger').text)
        self.select_workspace('Apex Cryptographic Studios')
        self.path_is('/organizations/org-2/overview')
        self.assertEqual(self.visible('h1').text, 'Apex Cryptographic Studios')
        self.driver.back()
        self.path_is('/organizations/org-1/revenue')
        self.assertIn('CyberShield', self.visible('.ws-trigger').text)
        self.driver.forward()
        self.path_is('/organizations/org-2/overview')
        original_tab = self.driver.current_window_handle
        self.driver.switch_to.new_window('tab')
        self.driver.get(self.base_url + '/organizations/org-1/inventory')
        self.visible('.workspace-context')
        self.assertIn('CyberShield', self.visible('.ws-trigger').text)
        self.driver.close()
        self.driver.switch_to.window(original_tab)
        self.assertIn('Apex', self.visible('.ws-trigger').text)
        self.click('.ws-trigger')
        search = self.visible('.ws-search input')
        self.assertEqual(self.driver.switch_to.active_element, search)
        search.send_keys('no-such-workspace')
        self.visible('.ws-empty')
        search.send_keys(Keys.ESCAPE)
        self.assertEqual(self.driver.switch_to.active_element.get_attribute('class'), 'ws-trigger')
        self.assertFalse(self.driver.find_elements(By.CSS_SELECTOR, '.ws-popover'))
        self.select_workspace('Personal workspace')
        self.path_is('/dashboard')
        self.visible('.sidebar a[href="/assets"]')
        self.assertFalse(self.driver.find_elements(By.CSS_SELECTOR, '.workspace-context'))
        self.driver.get(self.base_url + '/organizations/missing/overview')
        self.wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'h1'), 'Organization unavailable'))
        self.assertFalse(self.driver.find_elements(By.CSS_SELECTOR, '.organization-overview'))

    def test_create_workspace_and_account_isolation(self):
        self.register()
        self.driver.get(self.base_url + '/organizations')
        self.wait.until(EC.element_to_be_clickable((By.XPATH, '//button[normalize-space()="Create organization"]'))).click()
        name = f'Selenium Team {uuid.uuid4().hex[:8]}'
        self.fill('#organization-name', name)
        self.click('.organization-create button[type="submit"]')
        self.wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'h1'), name))
        url = self.driver.current_url
        self.driver.refresh()
        self.wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'h1'), name))
        self.click('.ws-trigger')
        self.assertIn(name, self.visible('.ws-popover').text)
        self.visible('.ws-search input').send_keys(Keys.ESCAPE)
        self.wait.until(EC.element_to_be_clickable((By.XPATH, '//button[normalize-space()="Log out"]'))).click()
        self.path_is('/login')
        self.register()
        self.driver.get(url)
        self.wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, 'h1'), 'Organization unavailable'))

    def test_mobile_and_collapsed_switcher(self):
        self.register()
        self.click('button[aria-label="Collapse sidebar"]')
        self.select_workspace('CyberShield Security Labs')
        self.path_is('/organizations/org-1/overview')
        self.driver.set_window_size(390, 844)
        self.click('button[aria-label="Open navigation"]')
        self.click('.ws-trigger')
        panel = self.visible('.ws-popover')
        rect = panel.rect
        width = self.driver.execute_script('return window.innerWidth')
        self.assertGreaterEqual(rect['x'], 0)
        self.assertLessEqual(rect['x'] + rect['width'], width)
        self.wait.until(EC.element_to_be_clickable((By.XPATH, '//button[contains(@class,"ws-option")][.//strong[text()="Personal workspace"]]'))).click()
        self.path_is('/dashboard')
        self.assertNotIn('is-open', self.driver.find_element(By.CSS_SELECTOR, '.sidebar').get_attribute('class'))
        smoke.ARTIFACTS.mkdir(exist_ok=True)
        self.driver.save_screenshot(str(smoke.ARTIFACTS / 'workspace-mobile.png'))
        self.driver.set_window_size(1440, 1000)
        self.click('button[aria-label="Expand sidebar"]')
        self.select_workspace('CyberShield Security Labs')
        self.visible('.organization-overview')
        self.click('.ws-trigger')
        self.visible('.ws-popover')
        self.driver.save_screenshot(str(smoke.ARTIFACTS / 'workspace-desktop.png'))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url')
    parser.add_argument('--headed', action='store_true')
    parser.add_argument('--chrome-binary')
    parser.add_argument('--timeout', type=float, default=30)
    smoke.CONFIG = parser.parse_args()
    names = ['test_workspace_routes_and_keyboard', 'test_create_workspace_and_account_isolation', 'test_mobile_and_collapsed_switcher']
    with smoke.application() as base_url:
        WorkspaceTests.base_url = base_url
        result = unittest.TextTestRunner(verbosity=2, resultclass=smoke.FailureArtifacts).run(
            unittest.TestSuite(WorkspaceTests(name) for name in names))
    raise SystemExit(0 if result.wasSuccessful() else 1)
