"""Run with the same setup as test_vaultchain.py; uses disposable app storage."""
import argparse
from pathlib import Path
import tempfile
import unittest
from selenium.webdriver import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
import test_vaultchain as smoke

class PurchaseTests(smoke.VaultChainTests):
 def api(self, path, payload=None):
  result = self.driver.execute_async_script('''
   const [path, payload, done] = arguments;
   import('/src/constants/api.js').then(async ({API_BASE_URL, AUTH_TOKEN_KEY}) => {
    const response = await fetch(API_BASE_URL + path, {method: payload === null ? 'GET' : 'POST',
     headers: {'Content-Type':'application/json',Authorization:'Bearer '+localStorage.getItem(AUTH_TOKEN_KEY)},
     ...(payload === null ? {} : {body:JSON.stringify(payload)})});
    done({status:response.status, body:await response.json()});
   }).catch(error => done({error:String(error)}));
  ''',path,payload)
  self.assertNotIn('error',result)
  self.assertLess(result['status'],400,result)
  return result['body']

 def slide(self, fraction):
  thumb=self.visible('.slide-confirm-thumb')
  track=self.visible('.slide-confirm-track')
  distance=int((track.get_property('clientWidth')-thumb.get_property('offsetWidth')-8)*fraction)
  ActionChains(self.driver).move_to_element(thumb).click_and_hold().move_by_offset(distance,0).release().perform()

 def test_purchase_slider_and_receipt(self):
  self.register()
  with tempfile.TemporaryDirectory() as directory:
   image=Path(directory)/'purchase.png';smoke.make_png(image)
   self.driver.get(self.base_url+'/upload')
   self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR,'input[type="file"]'))).send_keys(str(image))
   self.fill('#upload-title','Purchase slider asset')
   self.click('.upload-page-form button[type="submit"]');self.visible('.upload-result-card')
  asset=self.api('/assets')['assets'][0]
  listing=self.api('/marketplace/listings',{'assetId':asset['id'],'title':'Purchase slider asset','price':25})['listing']
  self.wait.until(EC.element_to_be_clickable((By.XPATH,'//button[normalize-space()="Log out"]'))).click()
  self.path_is('/login');self.register()
  self.driver.get(self.base_url+'/marketplace/'+listing['reference'])
  self.click('.purchase-action button')
  self.visible('.purchase-dialog[open]')
  self.slide(.35)
  self.assertEqual(self.api('/marketplace/listings/'+listing['reference'])['listing']['status'],'active')
  self.assertFalse(self.driver.find_elements(By.CSS_SELECTOR,'.purchase-confirmation-card'))
  self.visible('.slide-confirm-thumb').send_keys(Keys.ENTER)
  self.wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR,'.purchase-review .error-banner'),'Insufficient'))
  self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR,'.slide-confirm-thumb')))
  self.api('/wallet/transactions',{'type':'deposit','amount':100,'description':'Disposable browser test'})
  self.slide(1)
  self.wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR,'.purchase-confirmation-card h3'),'Purchase successful'))
  self.assertIn('25 credits',self.visible('.purchase-confirmation-card').text)
  self.assertIn('75 credits',self.visible('.purchase-confirmation-card').text)
  self.assertEqual(self.api('/wallet')['wallet']['balance'],75)
  self.assertEqual(self.api('/marketplace/listings/'+listing['reference'])['listing']['status'],'sold')
  self.assertTrue(self.visible('.purchase-dialog[open]').is_displayed())
  smoke.ARTIFACTS.mkdir(exist_ok=True)
  self.driver.save_screenshot(str(smoke.ARTIFACTS/'purchase-confirmation.png'))
  self.wait.until(EC.element_to_be_clickable((By.XPATH,'//button[normalize-space()="View purchased asset"]'))).click()
  self.path_is('/assets/'+str(asset['id'])+'/inspect')

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--base-url');parser.add_argument('--headed',action='store_true');parser.add_argument('--chrome-binary');parser.add_argument('--timeout',type=float,default=30)
 smoke.CONFIG=parser.parse_args()
 with smoke.application() as url:
  PurchaseTests.base_url=url
  result=unittest.TextTestRunner(verbosity=2,resultclass=smoke.FailureArtifacts).run(unittest.TestSuite([PurchaseTests('test_purchase_slider_and_receipt')]))
 raise SystemExit(0 if result.wasSuccessful() else 1)
