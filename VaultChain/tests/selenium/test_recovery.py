"""Exercise profile recovery setup and password reset with disposable app storage."""
import argparse
import unittest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
import test_vaultchain as smoke

class RecoveryTests(smoke.VaultChainTests):
 def birth_date(self, selector):
  self.driver.execute_script('''
   const input = document.querySelector(arguments[0]);
   Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'2000-02-29');
   input.dispatchEvent(new Event('input',{bubbles:true}));
  ''', selector)

 def test_recovery_setup_and_reset(self):
  self.register()
  self.driver.get(self.base_url+'/profile')
  Select(self.visible('#recovery-question')).select_by_value('first_pet')
  self.fill('#recovery-answer','Captain Snow')
  self.birth_date('#recovery-birth-date')
  self.fill('#recovery-current-password',self.password)
  self.click('.recovery-settings button[type="submit"]')
  code=self.visible('[data-testid="recovery-code"]').text
  self.assertEqual(len(code),39)
  self.click('.recovery-acknowledgement input')
  self.driver.find_element(By.XPATH,'//button[normalize-space()="Done"]').click()
  self.wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR,'.recovery-explanation h3'),'Recovery is enabled'))
  self.driver.refresh()
  self.wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR,'.recovery-explanation h3'),'Recovery is enabled'))
  self.assertEqual(self.visible('#recovery-answer').get_attribute('value'),'')
  self.assertEqual(self.visible('#recovery-birth-date').get_attribute('value'),'')
  self.driver.find_element(By.XPATH,'//button[normalize-space()="Log out"]').click()
  self.path_is('/login'); self.click('a[href="/forgot-password"]'); self.path_is('/forgot-password')
  self.fill('#reset-identifier',self.email)
  Select(self.visible('#reset-question')).select_by_value('first_pet')
  self.fill('#reset-answer','wrong answer'); self.birth_date('#reset-birth-date')
  self.fill('#reset-code',code); self.fill('#reset-password','New-Recovery-Password-42!'); self.fill('#reset-confirm','New-Recovery-Password-42!')
  self.click('button[type="submit"]')
  self.wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR,'.error-banner'),'Unable to recover'))
  self.fill('#reset-answer','captain snow')
  self.driver.set_window_size(390,844)
  self.driver.execute_script('window.scrollTo(0,0)')
  self.assertTrue(self.driver.execute_script('return document.documentElement.scrollWidth <= window.innerWidth'))
  self.driver.save_screenshot(str(smoke.ARTIFACTS/'recovery-mobile.png'))
  self.click('button[type="submit"]')
  self.wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR,'.recovery-code-card h2'),'Password reset'))
  self.click('a[href="/login"]')
  self.fill('#login-email',self.email); self.fill('#login-password','New-Recovery-Password-42!')
  self.click('button[type="submit"]'); self.path_is('/dashboard')
  self.driver.set_window_size(1440,1000)
  self.driver.get(self.base_url+'/profile')
  self.wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR,'.recovery-explanation h3'),'Recovery is not set up'))

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--base-url');parser.add_argument('--headed',action='store_true');parser.add_argument('--chrome-binary');parser.add_argument('--timeout',type=int,default=25)
 smoke.CONFIG=parser.parse_args()
 with smoke.application() as base_url:
  RecoveryTests.base_url=base_url
  suite=unittest.TestSuite([RecoveryTests('test_recovery_setup_and_reset')])
  result=unittest.TextTestRunner(verbosity=2,resultclass=smoke.FailureArtifacts).run(suite)
 raise SystemExit(0 if result.wasSuccessful() else 1)
