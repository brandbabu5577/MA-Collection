'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const root = process.cwd();
const appRel = 'frontend/js/app.js';
const authRel = 'frontend/js/auth.js';
const appPath = path.join(root, appRel);
const authPath = path.join(root, authRel);

if (!fs.existsSync(appPath) || !fs.existsSync(authPath)) {
  console.error('Project folder mein app.js/auth.js nahi mili.');
  process.exit(1);
}

const originals = {
  [appRel]: fs.readFileSync(appPath, 'utf8'),
  [authRel]: fs.readFileSync(authPath, 'utf8')
};
const updated = { ...originals };

function replaceOnce(file, label, oldText, newText) {
  const source = updated[file];
  const pos = source.indexOf(oldText);

  if (pos < 0 || source.indexOf(oldText, pos + oldText.length) >= 0) {
    throw new Error('Patch anchor missing ya duplicate hai: ' + label);
  }

  updated[file] =
    source.slice(0, pos) + newText + source.slice(pos + oldText.length);
}

const patches = [
  [
    appRel,
    'logo helper',
    'function settingsPage(){',
    `function storeLogoUrl(){
  const s=window.MA_STORE, c=window.MA_SUPABASE;
  if(!s?.logo_path||!c?.storage)return '';
  return c.storage.from('store-logos').getPublicUrl(s.logo_path)?.data?.publicUrl||'';
}
function applyStoreBranding(){
  const s=window.MA_STORE, url=storeLogoUrl();
  ['.brand-mark','.store-avatar'].forEach(sel=>{
    const el=document.querySelector(sel);
    if(!el)return;
    if(url){
      const img=document.createElement('img');
      img.src=url; img.alt=(s?.name||'Store')+' logo';
      img.style.cssText='width:100%;height:100%;object-fit:contain;border-radius:inherit';
      el.replaceChildren(img); el.style.overflow='hidden';
    }else{el.textContent='MA';el.style.overflow='';}
  });
  const label=document.querySelector('.store-meta strong');
  if(label)label.textContent=s?.name||'MA Collection';
  const type=document.querySelector('.store-meta span');
  if(type)type.textContent=s?.business_type||'Clothing & garments';
  const preview=document.querySelector('#storeLogoPreview');
  if(preview){
    preview.replaceChildren();
    if(url){
      const img=document.createElement('img');
      img.src=url; img.alt='Current store logo';
      img.style.cssText='max-width:100%;max-height:100%;object-fit:contain';
      preview.appendChild(img);
    }else{
      const span=document.createElement('span');
      span.textContent='MA'; preview.appendChild(span);
    }
  }
}
function settingsPage(){`
  ],
  [
    appRel,
    'logo profile section',
    '</form></div><div class="settings-block"><h3>Store preferences</h3>',
    `</form></div><div class="settings-block"><h3>Store logo</h3>
<p>Upload your store logo. PNG, JPEG or WebP; maximum 2 MB.</p>
<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
  <div id="storeLogoPreview" style="width:104px;height:84px;display:grid;place-items:center;border:1px solid var(--line);border-radius:12px;overflow:hidden"><span>MA</span></div>
  <div style="display:grid;gap:9px;flex:1;min-width:220px">
    <label for="storeLogoInput">Choose logo file</label>
    <input id="storeLogoInput" type="file" accept="image/png,image/jpeg,image/webp">
    <small>Displayed in sidebar and receipt.</small>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button type="button" class="btn primary" data-action="upload-store-logo">Upload logo</button>
      <button type="button" class="btn" data-action="remove-store-logo">Remove logo</button>
    </div>
  </div>
</div></div><div class="settings-block"><h3>Store preferences</h3>`
  ],
  [
    appRel,
    'render branding',
    'function renderPage(){\n if (!currentRole())',
    'function renderPage(){\n  applyStoreBranding();\n  if (!currentRole())'
  ],
  [
    appRel,
    'refresh branding after render',
    " hideForbiddenActions($('#pageContent'));",
    "  applyStoreBranding();\n  hideForbiddenActions($('#pageContent'));"
  ],
  [
    appRel,
    'logo actions',
    'function handleAction(action,target){',
    `async function uploadStoreLogo(button){
  const client=window.MA_SUPABASE, store=window.MA_STORE;
  if(!client?.storage||!store?.id||store.role!=='owner'){
    toast('Only the shop owner can upload a logo.'); return;
  }
  const input=document.querySelector('#storeLogoInput');
  const file=input?.files?.[0];
  if(!file){toast('Choose a logo file first.');return;}
  const types={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
  if(!types[file.type]){toast('Use PNG, JPEG or WebP.');return;}
  if(file.size<1||file.size>2*1024*1024){toast('Logo must be 2 MB or smaller.');return;}

  const oldPath=store.logo_path||'';
  const newPath=store.id+'/'+Date.now()+'-logo.'+types[file.type];
  if(button){button.disabled=true;button.textContent='Uploading...';}
  let uploaded=false;
  try{
    const result=await client.storage.from('store-logos').upload(newPath,file,{
      cacheControl:'3600',contentType:file.type,upsert:false
    });
    if(result.error)throw result.error;
    uploaded=true;

    const saved=await client.from('stores').update({logo_path:newPath})
      .eq('id',store.id).select('id,logo_path').maybeSingle();
    if(saved.error)throw saved.error;
    if(!saved.data)throw new Error('Logo path was not saved.');

    store.logo_path=saved.data.logo_path||newPath;
    uploaded=false;
    if(oldPath){
      const removed=await client.storage.from('store-logos').remove([oldPath]);
      if(removed.error)console.warn('Old logo cleanup failed:',removed.error);
    }
    if(input)input.value='';
    renderPage();
    toast('Store logo uploaded successfully.');
  }catch(err){
    console.error('Logo upload failed:',err);
    if(uploaded)await client.storage.from('store-logos').remove([newPath]);
    toast('Logo upload failed. Check connection and owner permissions.');
  }finally{
    if(button&&button.isConnected){button.disabled=false;button.textContent='Upload logo';}
    applyStoreBranding();
  }
}
async function removeStoreLogo(button){
  const client=window.MA_SUPABASE, store=window.MA_STORE;
  if(!client?.storage||!store?.id||store.role!=='owner'){
    toast('Only the shop owner can remove a logo.');return;
  }
  const oldPath=store.logo_path;
  if(!oldPath){toast('No logo to remove.');return;}
  if(!confirm('Remove the store logo?'))return;
  if(button)button.disabled=true;
  try{
    const saved=await client.from('stores').update({logo_path:null})
      .eq('id',store.id).select('id').maybeSingle();
    if(saved.error)throw saved.error;
    if(!saved.data)throw new Error('Logo path was not cleared.');
    store.logo_path='';
    renderPage();
    const removed=await client.storage.from('store-logos').remove([oldPath]);
    if(removed.error)console.warn('Old logo cleanup failed:',removed.error);
    toast('Store logo removed.');
  }catch(err){
    console.error('Logo removal failed:',err);
    toast('Could not remove logo. Check owner permissions.');
  }finally{
    if(button&&button.isConnected)button.disabled=false;
    applyStoreBranding();
  }
}
function handleAction(action,target){`
  ],
  [
    appRel,
    'wire logo buttons',
    "case 'store-switch':currentPage='settings';currentSettingsTab='Store profile';renderPage();break;",
    "case 'store-switch':currentPage='settings';currentSettingsTab='Store profile';renderPage();break;case 'upload-store-logo':uploadStoreLogo(target);break;case 'remove-store-logo':removeStoreLogo(target);break;"
  ],
  [
    appRel,
    'receipt logo',
    "const receipt=$('#modalHost .receipt');",
    `const receipt=$('#modalHost .receipt');
  if(receipt){
    const url=storeLogoUrl();
    if(url&&!receipt.querySelector('.receipt-logo')){
      const img=document.createElement('img');
      img.className='receipt-logo';img.src=url;img.alt='Store logo';
      img.style.cssText='display:block;max-width:110px;max-height:70px;object-fit:contain;margin:0 auto 10px';
      const brand=receipt.querySelector('.receipt-brand');
      if(brand)brand.before(img);else receipt.prepend(img);
    }
  }`
  ],
  [
    authRel,
    'load logo path',
    ".select('store_id, role, stores(name, business_type, phone, address)')",
    ".select('store_id, role, stores(name, business_type, phone, address, logo_path)')"
  ],
  [
    authRel,
    'map logo path',
    "      address: row.stores && row.stores.address ? row.stores.address : '',\n      role: row.role",
    "      address: row.stores && row.stores.address ? row.stores.address : '',\n      logo_path: row.stores && row.stores.logo_path ? row.stores.logo_path : '',\n      role: row.role"
  ],
  [
    authRel,
    'initialize new store',
    "unlockApp({ id: data, name, business_type: businessType, phone: phone || '', address: address || '', role: 'owner' });",
    "unlockApp({ id: data, name, business_type: businessType, phone: phone || '', address: address || '', logo_path: '', role: 'owner' });"
  ],
  [
    authRel,
    'expose logo path',
    "window.MA_STORE = { id: store.id, name: store.name, business_type: store.business_type || 'Clothing & garments', phone: store.phone || '', address: store.address || '', role: store.role };",
    "window.MA_STORE = { id: store.id, name: store.name, business_type: store.business_type || 'Clothing & garments', phone: store.phone || '', address: store.address || '', logo_path: store.logo_path || '', role: store.role };"
  ]
];

try {
  for (const p of patches) replaceOnce(...p);
} catch (err) {
  console.error('Patch cancelled; no files changed:', err.message);
  process.exit(1);
}

for (const [rel, content] of Object.entries(updated)) {
  const temp = path.join(os.tmpdir(), 'ma-logo-check-' + process.pid + (rel === authRel ? '.mjs' : '.js'));
  fs.writeFileSync(temp, content);
  const check = spawnSync(process.execPath, ['--check', temp], {encoding:'utf8'});
  try { fs.unlinkSync(temp); } catch {}
  if (check.status !== 0) {
    console.error('Syntax check failed:', rel, check.stderr || check.stdout);
    process.exit(1);
  }
}

const backupDir = path.join(root,'.backups','store-logo-patch-'+Date.now());
fs.mkdirSync(backupDir,{recursive:true});
for(const rel of Object.keys(originals)){
  fs.writeFileSync(path.join(backupDir,path.basename(rel)+'.bak'),originals[rel]);
}

try {
  for(const rel of Object.keys(updated)) fs.writeFileSync(path.join(root,rel),updated[rel]);
} catch(err) {
  for(const rel of Object.keys(originals)){
    try{fs.writeFileSync(path.join(root,rel),originals[rel]);}catch{}
  }
  console.error('Write failed; rollback attempted:',err.message);
  process.exit(1);
}

console.log('Logo upload patch applied.');
console.log('Backups saved to:',backupDir);
console.log('Syntax checks passed. Run npm test next.');