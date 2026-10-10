"""Read-only diagnostic of actual formal room CSS; preserves failing assertion."""
import sys,json
from pathlib import Path
import qa_v653_shop_purchase_ui as m
old=m.PurchaseRunner.capture
def capture(self,page,locator,folder,name):
 if name=='home-world':
  data=page.evaluate('''()=>{const nodes=[...document.querySelectorAll('.v4-shell,.v4-dashboard-grid,.v4-ai-companion')];const rules=[];function walk(rs){for(const r of rs){if(r.selectorText&&nodes.some(n=>{try{return n.matches(r.selectorText)}catch{return false}})&&/background|home-room/.test(r.cssText))rules.push(r.cssText);if(r.cssRules)walk(r.cssRules)}}for(const s of document.styleSheets){try{walk(s.cssRules)}catch{}}return {nodes:nodes.map(n=>({tag:n.className,room:n.dataset.room,background:getComputedStyle(n).backgroundImage,roomVar:getComputedStyle(n).getPropertyValue('--equipped-room-scene'),overlay:getComputedStyle(n).getPropertyValue('--home-room-overlay'),rect:n.getBoundingClientRect().toJSON()})),rules}}''')
  (folder/'home-css-diagnostic.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 return old(self,page,locator,folder,name)
m.PurchaseRunner.capture=capture
sys.exit(m.main())
