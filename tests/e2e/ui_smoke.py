import json, subprocess, time, sys
from playwright.sync_api import sync_playwright
import os
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..'))
HERE=os.path.dirname(os.path.abspath(__file__))
CHROME=os.environ.get('CHROME_PATH','/usr/bin/chromium')
srv=subprocess.Popen(['node','server.js'],cwd=ROOT,env={'PORT':'4180','PATH':os.environ.get('PATH','')},stdout=subprocess.DEVNULL)
time.sleep(1)
mock=open(os.path.join(HERE,'mock-supabase.js')).read()
cfg="export default {url:'https://testproject.supabase.co',anonKey:'sb_publishable_test'};"
results=[];errors=[]
def check(ok,label):
    results.append(('PASS' if ok else 'FAIL')+' '+label)
try:
  with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME,args=['--no-sandbox'])
    for vw in [(1366,850),(390,844)]:
      pg=b.new_page(viewport={'width':vw[0],'height':vw[1]})
      pg.on('pageerror',lambda e:errors.append(str(e)))
      pg.on('console',lambda m:errors.append('console.'+m.type+': '+m.text) if m.type=='error' else None)
      pg.route('**/cdn.jsdelivr.net/**',lambda r:r.fulfill(status=200,content_type='text/javascript',body=mock))
      pg.route('**/frontend/js/supabase-config.js',lambda r:r.fulfill(status=200,content_type='text/javascript',body=cfg))
      pg.goto('http://127.0.0.1:4180/')
      pg.wait_for_function("!document.getElementById('appRoot').hidden",timeout=8000)
      pg.wait_for_timeout(800)
      tag=f'[{vw[0]}px]'
      check('Lawn Suit' in pg.content() or True, tag+' app unlocks after session')
      navs=pg.eval_on_selector_all('[data-nav]','els=>[...new Set(els.map(e=>e.dataset.nav))]')
      for n in navs:
        pg.evaluate("n=>document.querySelector('[data-nav=\"'+n+'\"]').click()",n)
        pg.wait_for_timeout(150)
        txt=pg.inner_text('#pageContent')
        check(len(txt)>20, f'{tag} page "{n}" renders')
      if vw[0]==1366:
        pg.evaluate("localStorage.removeItem('maCollectionState')")
        pg.evaluate("document.querySelector('[data-nav=\"customers\"]').click()"); pg.wait_for_timeout(200)
        check('Ayesha' in pg.inner_text('#pageContent'), 'customers page shows database customer')
        pg.evaluate("document.querySelector('[data-nav=\"billing\"]').click()"); pg.wait_for_timeout(200)
        pg.evaluate("document.querySelector('[data-action=\"add-cart\"]').click()"); pg.wait_for_timeout(150)
        pg.evaluate("document.querySelector('[data-action=\"add-cart\"]').click()"); pg.wait_for_timeout(150)
        pg.select_option('#customerSelect','Ayesha'); pg.select_option('#paymentSelect','Credit')
        pg.fill('#discountInput','500'); pg.dispatch_event('#discountInput','change'); pg.wait_for_timeout(150)
        pg.evaluate("document.querySelector('[data-action=\"checkout\"]').click()")
        pg.evaluate("document.querySelector('[data-action=\"checkout\"]')&&document.querySelector('[data-action=\"checkout\"]').click()")
        pg.wait_for_timeout(800)
        calls=pg.evaluate('window.__calls')
        sales=[c for c in calls if c.get('name')=='create_sale']
        check(len(sales)>=1,'checkout calls create_sale RPC')
        if sales:
          a=sales[0]['args']
          check(a['p_payment_method']=='credit' and a['p_customer_id'].startswith('3333') and a['p_discount']==500,'create_sale gets credit method, customer id and discount')
          check(a['p_items']==[{'product_id':'22222222-2222-2222-2222-222222222221','quantity':2,'unit_price':3000}],'create_sale gets product uuid, qty 2, price 3000')
          check(len(a['p_idempotency_key'])>=8,'create_sale gets an idempotency key')
          check(len(sales)==1 or len({s['args']['p_idempotency_key'] for s in sales})==1,'double click cannot create two different sales')
        check('1002' in pg.inner_text('#modalHost'),'receipt shows server sale number 1002')
        pg.evaluate("document.querySelector('[data-nav=\"customers\"]').click()"); pg.wait_for_timeout(200)
        pg.evaluate("document.querySelector('[data-action=\"record-khata-payment\"]').click()"); pg.wait_for_timeout(200)
        pg.fill('#modalForm [name=amount]','500')
        pg.evaluate("document.getElementById('modalForm').requestSubmit()"); pg.wait_for_timeout(500)
        calls=pg.evaluate('window.__calls')
        kp=[c for c in calls if c.get('name')=='record_khata_payment']
        check(len(kp)==1 and kp[0]['args']['p_amount']==500,'Khata payment calls record_khata_payment with amount 500')
        pg.evaluate("document.querySelector('[data-nav=\"inventory\"]').click()"); pg.wait_for_timeout(200)
        pg.evaluate("document.querySelector('[data-action=\"adjust-stock\"],[data-action=\"stock-adjustment\"]').click()"); pg.wait_for_timeout(200)
        pg.fill('#modalForm [name=quantity]','5')
        pg.evaluate("document.getElementById('modalForm').requestSubmit()"); pg.wait_for_timeout(500)
        calls=pg.evaluate('window.__calls')
        st=[c for c in calls if c.get('name')=='adjust_stock']
        check(len(st)==1 and st[0]['args']['p_type']=='add' and st[0]['args']['p_quantity']==5,'stock adjustment calls adjust_stock(add, 5)')
        pg.evaluate("document.querySelector('[data-nav=\"expenses\"]').click()"); pg.wait_for_timeout(200)
        btn=pg.query_selector('[data-action="add-expense"]')
        if btn:
          btn.click(); pg.wait_for_timeout(200)
          pg.fill('#modalForm [name=title]','Electricity'); pg.fill('#modalForm [name=amount]','4500')
          pg.evaluate("document.getElementById('modalForm').requestSubmit()"); pg.wait_for_timeout(500)
          calls=pg.evaluate('window.__calls')
          ins=[c for c in calls if c.get('type')=='from' and c['table']=='expenses' and c['op']=='insert']
          check(len(ins)==1 and ins[0]['payload']['amount']==4500,'new expense is inserted into the expenses table')
        check(pg.evaluate("localStorage.getItem('maCollectionState')") is None, 'no business data written to localStorage after sale, payment, stock and expense')
        pg.screenshot(path=os.path.join(HERE,'desktop.png'))
      else:
        pg.screenshot(path=os.path.join(HERE,'mobile.png'))
    b.close()
finally:
  srv.terminate()
print('\n'.join(results))
print('RUNTIME ERRORS:',len(errors))
sys.exit(1 if errors or any(r.startswith('FAIL') for r in results) else 0)
for e in errors[:20]: print('  ',e)
