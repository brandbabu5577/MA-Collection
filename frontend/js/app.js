(() => {
'use strict';
const $ = (s, p=document) => p.querySelector(s);
const $$ = (s, p=document) => [...p.querySelectorAll(s)];
const money = n => { const value=Number(n??0); return 'Rs. '+(Number.isSafeInteger(value)?value.toLocaleString('en-PK',{maximumFractionDigits:0}):'—'); };
function toSafeWholeNumber(value,label){const number=typeof value==='string'&&value.trim()===''?0:Number(value);if(!Number.isSafeInteger(number)||number<0)throw new Error(`${label} must be a non-negative whole number.`);return number;}
function safeAdd(a,b,label='Calculation'){const result=a+b;if(!Number.isSafeInteger(result))throw new Error(`${label} exceeds the safe calculation limit.`);return result;}
function safeMultiply(a,b,label='Calculation'){const result=a*b;if(!Number.isSafeInteger(result))throw new Error(`${label} exceeds the safe calculation limit.`);return result;}
function calculateCartTotals(items,discountValue=0,validateDiscount=true){const subtotal=items.reduce((sum,item)=>{const price=toSafeWholeNumber(item.price,'Price'),qty=toSafeWholeNumber(item.qty,'Quantity');if(qty<1)throw new Error('Each item quantity must be at least 1.');return safeAdd(sum,safeMultiply(price,qty,'Item total'),'Subtotal');},0);const discount=toSafeWholeNumber(discountValue,'Discount');if(validateDiscount&&discount>subtotal)throw new Error('Discount cannot exceed the subtotal.');return {subtotal,discount,total:Math.max(0,subtotal-discount)};}
const dateShort = d => new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
const dateTime = d => new Date(d).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
const todayIso = () => new Date().toISOString().slice(0,10);
const e = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const iconPaths = {
  dashboard:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
  package:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>',
  layers:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
  cart:'<circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/><path d="M2 3h2l3 12h12l3-9H5"/>',
  receipt:'<path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z"/><path d="M8 8h8M8 12h8M8 16h4"/>',
  chart:'<path d="M3 3v18h18"/><path d="m7 14 4-4 4 3 5-7"/>',
  people:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  truck:'<path d="M3 6h12v12H3zM15 10h4l3 3v5h-7"/><circle cx="7.5" cy="19" r="1.5"/><circle cx="18.5" cy="19" r="1.5"/>',
  wallet:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 8h18M16 14h2"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.5 2.6-1.7-.7a8 8 0 0 1-1.8 1l-.3 1.9h-3l-.3-1.9a8 8 0 0 1-1.8-1l-1.7.7-1.5-2.6 1.4-1.1A7 7 0 0 1 6.5 12c0-.7.1-1.4.4-2l-1.4-1.1L7 6.3l1.7.7a8 8 0 0 1 1.8-1l.3-1.9h3l.3 1.9a8 8 0 0 1 1.8 1l1.7-.7 1.5 2.6-1.4 1.1c.3.6.4 1.3.4 2s-.1 1.4-.4 2Z"/>',
  tag:'<path d="M20.5 13.5 13 21l-10-10V3h8l9.5 10.5Z"/><circle cx="7.5" cy="7.5" r="1"/>',
  search:'<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  edit:'<path d="m16 4 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z"/>',
  trash:'<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 19v2h16v-2"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  filter:'<path d="M4 5h16M7 12h10m-7 7h4"/>',
  bell:'<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  shirt:'<path d="m8 4 4 2 4-2 5 4-3 4-2-1v10H8V11l-2 1-3-4 5-4Z"/>',
  receiptCheck:'<path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z"/><path d="m8 11 2 2 5-5"/>',
  box:'<path d="M4 7 12 3l8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/>',
  coin:'<circle cx="12" cy="12" r="9"/><path d="M16 8.5c-1-1-2-1.5-4-1.5-1.8 0-3 .9-3 2.2 0 3.3 7 1.3 7 4.7 0 1.5-1.7 2.6-4 2.6-1.7 0-3-.5-4-1.5M12 5v14"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9A7 7 0 0 1 18 7l2 5M4 12l2 5a7 7 0 0 0 12.5-2"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  spark:'<path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  chevron:'<path d="m8 10 4 4 4-4"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1.2.8-1.5 1.2-1.5 2.5M12 17h.01"/>'
};
function ic(name,size=16){ return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]||iconPaths.spark}</svg>`; }
const navGroups = [
 {label:'Main',items:[['dashboard','Dashboard','dashboard'],['billing','New sale','cart'],['sales','Sales history','receipt']]},
 {label:'Catalog',items:[['products','Products','package'],['inventory','Inventory','layers'],['categories','Categories','tag']]},
 {label:'People',items:[['customers','Customers & khata','people'],['suppliers','Suppliers','truck'],['employees','Employees','user']]},
 {label:'Transactions',items:[['purchase-orders','Purchase orders','box'],['expenses','Expenses','wallet']]},
 {label:'Analysis',items:[['reports','Reports & analytics','chart']]},
 {label:'System',items:[['settings','Settings','settings']]}
];

const ROLE_PAGE_ACCESS = Object.freeze({
  owner: ['dashboard','billing','sales','products','inventory','categories','customers','suppliers','employees','purchase-orders','expenses','reports','settings'],
  manager: ['dashboard','billing','sales','products','inventory','categories','customers','suppliers','purchase-orders','expenses','reports'],
  cashier: ['billing','sales','products','customers']
});
const CASHIER_ACTIONS = new Set([
  'toggle-menu','close-menu','close-modal','backdrop-close','modal-submit',
  'help','toggle-theme','product-category','pos-category','add-cart',
  'cart-qty','clear-cart','checkout','share-bill','sales-filter',
  'view-sale','print-sale','add-customer','edit-customer','view-customer'
]);
const MANAGER_BLOCKED_ACTIONS = new Set([
  'add-employee','edit-employee','delete-employee','store-switch',
  'settings-tab','toggle-setting','save-inventory-settings',
  'reset-demo','clear-local-data'
]);
function currentRole() {
  const role = window.MA_STORE && window.MA_STORE.role;
  return Object.prototype.hasOwnProperty.call(ROLE_PAGE_ACCESS, role) ? role : null;
}
function canAccessPage(page) {
  const role = currentRole();
  return !!role && ROLE_PAGE_ACCESS[role].includes(page);
}
function canSubmitForm(form) {
  const role = currentRole();
  if (!form || !role) return false;
  if (role === 'owner') return true;
  const kind = form.dataset ? form.dataset.form : '';
  if (role === 'manager') {
    return kind !== 'employee' && form.id !== 'storeSettingsForm';
  }
  return role === 'cashier' && kind === 'customer';
}
function canPerformAction(action, target) {
  const role = currentRole();
  if (!role) return false;
  if (role === 'owner') return true;

  if (role === 'manager') {
    if (MANAGER_BLOCKED_ACTIONS.has(action)) return false;
    if (action === 'modal-submit') {
      const id = target && target.dataset ? target.dataset.submitForm : '';
      const form = id ? document.getElementById(id) : null;
      return form ? canSubmitForm(form) : !!lastReceipt;
    }
    return true;
  }

  if (!CASHIER_ACTIONS.has(action)) return false;
  if (action === 'modal-submit') {
    const id = target && target.dataset ? target.dataset.submitForm : '';
    const form = id ? document.getElementById(id) : null;
    return form ? canSubmitForm(form) : !!lastReceipt;
  }
  return true;
}
function hideForbiddenActions(root) {
  if (!root) return;
  root.querySelectorAll('[data-action]').forEach(el => {
    if (!canPerformAction(el.dataset.action, el)) el.hidden = true;
  });
}

let currentPage = (() => { try { return sessionStorage.getItem('maCollectionCurrentPage') || 'dashboard'; } catch (_) { return 'dashboard'; } })();
let salesFilter='All';
let productFilter='All';
let categoryFilter='All';
let currentSettingsTab='Store profile';
let themeDark=false;
const DEFAULT_STORE_SETTINGS=Object.freeze({show_sku:true,warn_low_stock:true,ask_customer_each_sale:true,allow_discounts:true,show_receipt_after_checkout:true,default_min_stock:5,stock_unit:"Pieces",compact_tables:false,receipt_footer:""});
let storeSettings={...DEFAULT_STORE_SETTINGS};
let storeDataGeneration=0;
let reportPeriod="This month";
let dashboardPeriod="This month";
let cart=[];
let lastReceipt=null;
let editingCartPriceId=null;
let checkoutBusy=false;
function isCurrentStoreLoad(storeId,generation){return generation===storeDataGeneration&&window.MA_STORE?.id===storeId;}
function clearStoreScopedState(){
 [products,customers,suppliers,employees,sales,expenses,purchaseOrders,khataLedger,categories].forEach(items=>items.splice(0,items.length));
 storeSettings={...DEFAULT_STORE_SETTINGS};cart=[];lastReceipt=null;editingCartPriceId=null;
}
let khataLedger=[];
const products = [
 {id:1001,name:'Embroidered Lawn 3-Piece',sku:'MA-1001',category:'Unstitched',price:4250,cost:2950,stock:18,minStock:5,color:'Ivory',size:'Unstitched'},
 {id:1002,name:'Premium Cotton Kurti',sku:'MA-1002',category:'Ready to wear',price:2850,cost:1650,stock:24,minStock:6,color:'Olive',size:'M / L / XL'},
 {id:1003,name:'Printed Lawn 2-Piece',sku:'MA-1003',category:'Unstitched',price:3200,cost:2180,stock:4,minStock:6,color:'Rose',size:'Unstitched'},
 {id:1004,name:'Chiffon Dupatta',sku:'MA-1004',category:'Accessories',price:1450,cost:780,stock:36,minStock:8,color:'Maroon',size:'Free size'},
 {id:1005,name:'Everyday Basic Kurta',sku:'MA-1005',category:'Ready to wear',price:1950,cost:1120,stock:9,minStock:5,color:'Sand',size:'S / M / L'},
 {id:1006,name:'Silk Festive 3-Piece',sku:'MA-1006',category:'Unstitched',price:6750,cost:4350,stock:7,minStock:3,color:'Teal',size:'Unstitched'},
 {id:1007,name:'Cotton Trousers',sku:'MA-1007',category:'Ready to wear',price:2250,cost:1320,stock:0,minStock:4,color:'Black',size:'S / M / L'},
 {id:1008,name:'Embellished Clutch',sku:'MA-1008',category:'Accessories',price:1850,cost:950,stock:12,minStock:4,color:'Gold',size:'One size'},
 {id:1009,name:'Winter Khaddar Suit',sku:'MA-1009',category:'Unstitched',price:3850,cost:2550,stock:16,minStock:5,color:'Rust',size:'Unstitched'},
 {id:1010,name:'Linen Co-ord Set',sku:'MA-1010',category:'Ready to wear',price:4950,cost:3200,stock:3,minStock:4,color:'Stone',size:'M / L / XL'},
 {id:1011,name:'Pearl Hair Accessory',sku:'MA-1011',category:'Accessories',price:650,cost:300,stock:28,minStock:8,color:'Pearl',size:'One size'},
 {id:1012,name:'Printed Viscose Shawl',sku:'MA-1012',category:'Accessories',price:2150,cost:1380,stock:11,minStock:5,color:'Navy',size:'Free size'}
];
const customers = [
 {id:201,name:'Ayesha Malik',phone:'0301 234 5678',email:'ayesha@email.com',balance:2500,orders:8,joined:'2026-04-12'},
 {id:202,name:'Sana Ahmed',phone:'0322 567 8890',email:'sana@email.com',balance:0,orders:12,joined:'2026-03-25'},
 {id:203,name:'Hira Rauf',phone:'0333 456 1100',email:'hira@email.com',balance:1800,orders:5,joined:'2026-06-01'},
 {id:204,name:'Mariam Shah',phone:'0300 998 2211',email:'mariam@email.com',balance:0,orders:4,joined:'2026-07-18'},
 {id:205,name:'Zainab Tariq',phone:'0311 789 4500',email:'zainab@email.com',balance:3700,orders:9,joined:'2026-02-13'}
];
const suppliers = [
 {id:301,name:'Al-Noor Fabrics',contact:'Usman Raza',phone:'0300 111 2040',category:'Fabric & unstitched',balance:12800},
 {id:302,name:'StyleCraft Wholesale',contact:'Nadia Khan',phone:'0321 448 2993',category:'Ready-to-wear',balance:0},
 {id:303,name:'Lahore Textile House',contact:'Bilal Ahmed',phone:'0334 110 6080',category:'Fabric & accessories',balance:4500},
 {id:304,name:'Pearl Accessories Co.',contact:'Hassan Ali',phone:'0312 908 7712',category:'Accessories',balance:2300}
];
const employees = [
 {id:401,name:'Fatima Noor',role:'Sales assistant',phone:'0302 556 4400',status:'Active'},
 {id:402,name:'Ali Hassan',role:'Cashier',phone:'0315 887 2201',status:'Active'}
];
const sales = [
 {id:1048,customer:'Sana Ahmed',date:new Date(Date.now()-1000*60*38).toISOString(),items:[{productId:1002,name:'Premium Cotton Kurti',qty:1,price:2850},{productId:1004,name:'Chiffon Dupatta',qty:1,price:1450}],total:4300,payment:'Cash',status:'Completed',profit:1890},
 {id:1047,customer:'Walk-in customer',date:new Date(Date.now()-1000*60*92).toISOString(),items:[{productId:1001,name:'Embroidered Lawn 3-Piece',qty:1,price:4250}],total:4250,payment:'Card',status:'Completed',profit:1300},
 {id:1046,customer:'Ayesha Malik',date:new Date(Date.now()-1000*60*60*4).toISOString(),items:[{productId:1005,name:'Everyday Basic Kurta',qty:2,price:1950}],total:3900,payment:'Credit',status:'Pending',profit:1660},
 {id:1045,customer:'Mariam Shah',date:new Date(Date.now()-1000*60*60*22).toISOString(),items:[{productId:1006,name:'Silk Festive 3-Piece',qty:1,price:6750}],total:6750,payment:'Cash',status:'Completed',profit:2400},
 {id:1044,customer:'Walk-in customer',date:new Date(Date.now()-1000*60*60*24*2).toISOString(),items:[{productId:1008,name:'Embellished Clutch',qty:2,price:1850}],total:3700,payment:'Cash',status:'Completed',profit:1800},
 {id:1043,customer:'Zainab Tariq',date:new Date(Date.now()-1000*60*60*24*3).toISOString(),items:[{productId:1009,name:'Winter Khaddar Suit',qty:1,price:3850},{productId:1011,name:'Pearl Hair Accessory',qty:1,price:650}],total:4500,payment:'Credit',status:'Pending',profit:1650},
 {id:1042,customer:'Hira Rauf',date:new Date(Date.now()-1000*60*60*24*4).toISOString(),items:[{productId:1003,name:'Printed Lawn 2-Piece',qty:1,price:3200}],total:3200,payment:'Card',status:'Completed',profit:1020}
];
const expenses = [
 {id:501,title:'Shop rent',category:'Rent',amount:35000,date:todayIso(),note:'Monthly shop rent'},
 {id:502,title:'Shopping bags & packaging',category:'Supplies',amount:4800,date:todayIso(),note:'Retail packaging'},
 {id:503,title:'Electricity bill',category:'Utilities',amount:6200,date:new Date(Date.now()-86400000*2).toISOString().slice(0,10),note:'Monthly utilities'},
 {id:504,title:'Tea & refreshments',category:'Other',amount:1200,date:new Date(Date.now()-86400000*3).toISOString().slice(0,10),note:'Staff refreshments'}
];
let purchaseOrders = [
 {id:701,supplier:'Al-Noor Fabrics',date:todayIso(),items:6,total:67500,status:'Pending'},
 {id:702,supplier:'StyleCraft Wholesale',date:new Date(Date.now()-86400000*4).toISOString().slice(0,10),items:12,total:42500,status:'Received'},
 {id:703,supplier:'Pearl Accessories Co.',date:new Date(Date.now()-86400000*8).toISOString().slice(0,10),items:8,total:12800,status:'Received'}
];
let categories = [
 {name:'Unstitched',count:products.filter(p=>p.category==='Unstitched').length,description:'Lawn, khaddar, formal suits'},
 {name:'Ready to wear',count:products.filter(p=>p.category==='Ready to wear').length,description:'Kurtis, co-ords, trousers'},
 {name:'Accessories',count:products.filter(p=>p.category==='Accessories').length,description:'Dupattas, clutches, jewellery'},
 {name:'Seasonal',count:0,description:'Limited-time collections'},
 {name:'Custom/Other',count:0,description:'User-defined category'}
];
const pageMeta = {
 dashboard:['Overview','A clear picture of your store, all in one place.'],billing:['New sale','Build a bill, take payment, and keep your stock up to date.'],sales:['Sales history','Track every order, payment, and receipt.'],products:['Products','Manage your collection, prices, sizes, and product details.'],inventory:['Inventory','Monitor stock levels and make quick stock adjustments.'],categories:['Categories','Keep your collection organized by product type.'],customers:['Customers & khata','Know your regulars and keep customer credit in check.'],suppliers:['Suppliers','Manage your vendors and outstanding balances.'],employees:['Employees','Manage the team members working at your counter.'],'purchase-orders':['Purchase orders','Keep replenishment orders organized from request to receipt.'],expenses:['Expenses','Track your day-to-day operating costs.'],reports:['Reports & analytics','Understand sales, profit, stock value, and customer trends.'],settings:['Settings','Manage your store preferences and workspace.']
};
function pageIcon(page){ const found=navGroups.flatMap(g=>g.items).find(a=>a[0]===page); return ic(found?.[2]||'dashboard'); }
function renderNav(){
 $('#navContainer').innerHTML = navGroups.map(g=>({...g,items:g.items.filter(([id])=>canAccessPage(id))})).filter(g=>g.items.length).map(g=>`<div class="nav-group"><div class="nav-label">${g.label}</div>${g.items.map(([id,label,ico])=>`<button class="nav-item ${currentPage===id?'active':''}" data-nav="${id}">${ic(ico)}<span>${label}</span>${id==='inventory'&&products.some(p=>p.stock<=p.minStock)?'<span class="nav-count">'+products.filter(p=>p.stock<=p.minStock).length+'</span>':''}</button>`).join('')}</div>`).join('');
  $('#mobileBottom').innerHTML = [['dashboard','Home','dashboard'],['products','Products','package'],['billing','New sale','cart'],['sales','Sales','receipt'],['settings','More','menu']].filter(([id])=>canAccessPage(id)).map(([id,label,ico])=>`<button class="${currentPage===id?'active':''}" data-nav="${id}">${ic(ico)}<span>${label}</span></button>`).join('');
}
function head(page,extra=''){const [title,desc]=pageMeta[page]||pageMeta.dashboard;return `<div class="page-head"><div><div class="page-kicker"><span class="kicker-dot"></span> SHOP WORKSPACE <span style="opacity:.5">/</span> ${e((pageMeta[page]||pageMeta.dashboard)[0].toUpperCase())}</div><h1>${e(title)}</h1><p class="page-desc">${e(desc)}</p></div>${extra?`<div class="head-actions">${extra}</div>`:''}</div>`;}
function stat(label,value,ico,foot='',trend=''){return `<div class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon">${ic(ico)}</span></div><div class="stat-value">${value}</div><div class="stat-footer">${trend?`<span class="trend">${trend}</span>`:''}${foot}</div></div>`;}
function productStatus(p){return p.stock<=0?'<span class="badge low">Out of stock</span>':storeSettings.warn_low_stock&&p.stock<=p.minStock?'<span class="badge warn">Low stock</span>':'<span class="badge good">In stock</span>';}
function paymentBadge(s){return s==='Credit'?'<span class="badge warn">Credit</span>':s==='Card'?'<span class="badge good">Card</span>':'<span class="badge good">Cash</span>';}
function productRow(p){return `<tr data-search-row="products" data-search-text="${e((p.name+' '+p.sku+' '+p.category+' '+p.color).toLowerCase())}" data-product-id="${p.id}"><td><div class="product-cell"><div class="product-thumb">${ic('shirt')}</div><div><strong>${e(p.name)}</strong>${storeSettings.show_sku?`<small>${e(p.sku)}</small>`:''}</div></div></td><td>${e(p.category)}</td><td>${e(p.size||'—')}</td><td><strong>${money(p.price)}</strong></td><td>${money(p.cost)}</td><td><div class="stock-layout"><strong>${p.stock}</strong></div></td><td>${productStatus(p)}</td><td><div class="row-actions"><button class="mini-icon" data-action="edit-product" data-id="${p.id}" aria-label="Edit product">${ic('edit')}</button><button class="mini-icon" data-action="delete-product" data-id="${p.id}" aria-label="Delete product">${ic('trash')}</button></div></td></tr>`;}
function salesRow(s){return `<tr data-search-row="sales" data-search-text="${e((s.id+' '+s.customer+' '+s.payment+' '+s.status).toLowerCase())}"><td><strong>#${s.id}</strong></td><td><div class="product-cell"><div class="person-avatar">${e(s.customer.split(' ').map(a=>a[0]).slice(0,2).join(''))}</div><div><strong>${e(s.customer)}</strong><small>${s.items.length} item${s.items.length!==1?'s':''}</small></div></div></td><td>${dateTime(s.date)}</td><td>${paymentBadge(s.payment)}</td><td><strong>${money(s.total)}</strong></td><td>${s.status==='Pending'?'<span class="badge warn">Pending</span>':'<span class="badge good">Completed</span>'}</td><td><div class="row-actions"><button class="mini-icon" data-action="view-sale" data-id="${s.id}" aria-label="View sale">${ic('eye')}</button><button class="mini-icon" data-action="print-sale" data-id="${s.id}" aria-label="Print receipt">${ic('receipt')}</button><button class="mini-icon" data-action="share-bill" data-id="${s.id}" aria-label="Share bill">${ic('download')}</button></div></td></tr>`;}
function tablePanel(title,subtitle,headers,rows,empty='No records found',min='610px'){return `<div class="panel"><div class="panel-head"><div><div class="panel-title">${title}</div><div class="panel-subtitle">${subtitle}</div></div></div><div class="table-wrap"><table style="min-width:${min}"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows||`<tr><td colspan="${headers.length}"><div class="empty">${ic('search',24)}<strong>${empty}</strong>Try adjusting your search or add a new record.</div></td></tr>`}</tbody></table></div></div>`;}
function dashboardPage(){
 const revenueToday=48250, profitToday=9180, pending=customers.reduce((s,c)=>s+c.balance,0), low=products.filter(p=>p.stock<=p.minStock).length;
 const recent=sales.slice(0,4).map(s=>`<div class="sale-row"><div class="sale-product-icon">${ic('receipt')}</div><div class="sale-meta"><strong>Sale #${s.id}</strong><span>${e(s.customer)} · ${dateTime(s.date)}</span></div><div class="sale-amount">${money(s.total)}<small>${e(s.payment)}</small></div></div>`).join('');
 const topProducts=[...products].sort((a,b)=>(b.price*b.stock)-(a.price*a.stock)).slice(0,4).map(p=>`<tr><td><div class="product-cell"><div class="product-thumb">${ic('shirt')}</div><div><strong>${e(p.name)}</strong><small>${e(p.sku)}</small></div></div></td><td>${e(p.category)}</td><td>${money(p.price)}</td><td><div class="stock-layout"><strong>${p.stock}</strong><div class="progress"><span style="width:${Math.min(100,p.stock*3)}%"></span></div></div></td></tr>`).join('');
 const chart=[42,55,47,72,62,83,71,96,64,75,90,82,100,77];
 return head('dashboard',`<button class="btn" data-action="export-dashboard">${ic('download')} Export summary</button><button class="btn primary" data-nav="billing">${ic('plus')} New sale</button>`)+
 `<div class="stats-grid grid">${stat("Today's sales",money(revenueToday),'wallet','vs. yesterday','↑ 12.8%')}${stat("Today's profit",money(profitToday),'chart','profit margin 19.0%','↑ 8.4%')}${stat('Products in stock',products.reduce((s,p)=>s+p.stock,0).toLocaleString(),'package',`${products.length} active products`)}${stat('Customer khata',money(pending),'people',`${customers.filter(c=>c.balance>0).length} customers with balance`,'')}</div>
 <div class="dashboard-main grid"><section class="panel"><div class="panel-head"><div><div class="panel-title">Sales overview</div><div class="panel-subtitle">Your store's sales performance this month</div></div><select class="control" id="dashboardPeriod"><option>This month</option><option>Last 7 days</option><option>This year</option></select></div><div class="panel-body"><div class="chart-header"><div><div class="chart-total">Rs. 3,84,650 <span>total revenue</span></div><div class="chart-legend" style="margin-top:9px"><span><i class="legend-dot" style="background:var(--accent)"></i>This period</span><span><i class="legend-dot" style="background:var(--olive)"></i>Previous period</span></div></div><span class="trend">↑ 16.2%</span></div><div class="bar-chart">${chart.map((v,i)=>`<div class="bar-col"><div class="bar" style="height:${Math.round(v*.66)}%"></div><div class="bar ${i===12?'emph':''}" style="height:${Math.round((100-v*.28)*.72)}%"></div></div>`).join('')}</div><div class="chart-labels">${['01','03','05','07','09','11','13','15','17','19','21','23','25','27'].map(d=>`<span>${d}</span>`).join('')}</div></div></section>
 <section class="panel"><div class="panel-head"><div><div class="panel-title">Recent sales</div><div class="panel-subtitle">Latest activity at your counter</div></div><button class="btn ghost small" data-nav="sales">View all ${ic('arrow',13)}</button></div><div class="panel-body"><div class="sales-list">${recent}</div></div></section></div>
 <div class="lower-grid grid"><section class="panel"><div class="panel-head"><div><div class="panel-title">Product snapshot</div><div class="panel-subtitle">Your most valuable stock items</div></div><button class="btn small" data-nav="products">Manage products ${ic('arrow',13)}</button></div><div class="table-wrap"><table style="min-width:500px"><thead><tr><th>Product</th><th>Category</th><th>Retail price</th><th>Stock level</th></tr></thead><tbody>${topProducts}</tbody></table></div></section>
 <section class="panel"><div class="panel-head"><div><div class="panel-title">Quick actions</div><div class="panel-subtitle">Common tasks, one tap away</div></div></div><div class="panel-body"><div class="quick-actions"><button class="quick-action" data-nav="products"><span class="quick-action-icon">${ic('package')}</span><span><strong>Add product</strong><small>Update your catalog</small></span></button><button class="quick-action" data-nav="inventory"><span class="quick-action-icon">${ic('layers')}</span><span><strong>Stock count</strong><small>${low} items need attention</small></span></button><button class="quick-action" data-nav="customers"><span class="quick-action-icon">${ic('people')}</span><span><strong>Customer khata</strong><small>Review outstanding</small></span></button><button class="quick-action" data-nav="reports"><span class="quick-action-icon">${ic('chart')}</span><span><strong>View reports</strong><small>Track your profit</small></span></button></div></div></section></div><div class="footer-note">MA Collection · Store workspace · Data is scoped to your active store</div>`;
}
function productsPage(){
 const productRows=products.filter(p=>(productFilter==='All'||(productFilter==='Low stock'?p.stock<=p.minStock:p.category===productFilter))).map(productRow).join('');
 return head('products',`<button class="btn" data-action="export-products">${ic('download')} Export</button><button class="btn primary" data-action="add-product">${ic('plus')} Add product</button>`)+
 `<div class="inventory-summary grid">${stat('Total products',products.length,'package','Across all categories')}${stat('Retail stock value',money(products.reduce((s,p)=>s+p.price*p.stock,0)),'wallet','Based on retail price')}${stat('Low stock alerts',products.filter(p=>p.stock<=p.minStock).length,'info','Review items to restock')}</div>
 <section class="panel"><div class="table-toolbar"><div class="count">Showing <strong>${products.filter(p=>productFilter==='All'||(productFilter==='Low stock'?p.stock<=p.minStock:p.category===productFilter)).length}</strong> products</div><div class="filter-bar"><div class="field-search">${ic('search')}<input type="search" data-local-search="products" placeholder="Search by name, SKU…"></div><select class="control" id="productCategoryFilter"><option>All</option>${categories.map(c=>`<option ${productFilter===c.name?'selected':''}>${e(c.name)}</option>`).join('')}<option ${productFilter==='Low stock'?'selected':''}>Low stock</option></select></div></div><div class="table-wrap"><table style="min-width:830px"><thead><tr><th>Product</th><th>Category</th><th>Size / fit</th><th>Retail price</th><th>Cost price</th><th>Stock</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead><tbody id="productTableBody">${productRows||`<tr><td colspan="8"><div class="empty">${ic('search',24)}<strong>No products found</strong>Try a different filter or add a product.</div></td></tr>`}</tbody></table></div><div class="pagination"><span>Stock quantities update when you complete a sale.</span><span class="page-n">${products.length} products in catalog</span></div></section>`;
}
function inventoryPage(){
 const totalUnits=products.reduce((s,p)=>s+p.stock,0), low=products.filter(p=>p.stock>0&&p.stock<=p.minStock), out=products.filter(p=>p.stock===0);
 const rows=[...products].sort((a,b)=>a.stock-b.stock).map(p=>`<tr data-search-row="inventory" data-search-text="${e((p.name+' '+p.sku+' '+p.category).toLowerCase())}"><td><div class="product-cell"><div class="product-thumb">${ic('shirt')}</div><div><strong>${e(p.name)}</strong><small>${e(p.sku)}</small></div></div></td><td>${e(p.category)}</td><td><div class="stock-layout"><strong>${p.stock} pcs</strong><div class="progress"><span style="width:${Math.min(100,p.stock*3)}%;background:${p.stock<=p.minStock?'var(--red)':'var(--olive)'}"></span></div></div></td><td>${p.minStock} pcs</td><td>${productStatus(p)}</td><td><div class="row-actions"><button class="btn small" data-action="adjust-stock" data-id="${p.id}">${ic('refresh')} Adjust</button></div></td></tr>`).join('');
 return head('inventory',`<button class="btn" data-action="export-inventory">${ic('download')} Export stock</button><button class="btn primary" data-action="stock-adjustment">${ic('plus')} Stock adjustment</button>`)+
 `<div class="inventory-summary grid">${stat('Units on hand',totalUnits.toLocaleString(),'layers','All active products')}${stat('Low stock',low.length,'info','Below minimum stock')}${stat('Out of stock',out.length,'package','Restock to resume sales')}</div>
 ${low.length||out.length?`<div class="inline-notice">${ic('info')}<div><strong>Stock needs attention.</strong> ${low.length} item(s) are low and ${out.length} are out of stock. Update quantities after your next supplier delivery.</div></div>`:''}
 <section class="panel"><div class="table-toolbar"><div><strong style="font-size:12px">Stock register</strong><div class="panel-subtitle">Current quantities and minimum levels</div></div><div class="field-search">${ic('search')}<input type="search" data-local-search="inventory" placeholder="Find an item…"></div></div><div class="table-wrap"><table style="min-width:780px"><thead><tr><th>Product</th><th>Category</th><th>Current stock</th><th>Minimum level</th><th>Status</th><th style="text-align:right">Action</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
function billingPage(){
 const shown=products.filter(p=>p.stock>0&&(categoryFilter==='All'||p.category===categoryFilter));
 let totals;try{totals=calculateCartTotals(cart,$('#discountInput')?.value||0,false);}catch{totals=calculateCartTotals(cart,0,false);}const {subtotal,discount,total}=totals;
 return head('billing',`<button class="btn" data-action="clear-cart">${ic('refresh')} Clear bill</button>`)+
 `<div class="pos-layout"><section class="panel"><div class="panel-head"><div><div class="panel-title">Select products</div><div class="panel-subtitle">${products.length} products in your collection</div></div><span class="badge good">${shown.length} available</span></div><div class="panel-body" style="padding-bottom:12px"><div class="filter-bar" style="margin-bottom:14px"><div class="field-search" style="max-width:none">${ic('search')}<input type="search" data-local-search="pos-products" placeholder="Search product or SKU…"></div></div><div class="filter-tabs" style="margin-bottom:14px;overflow-x:auto">${['All',...categories.map(c=>c.name)].map(c=>`<button class="${categoryFilter===c?'active':''}" data-action="pos-category" data-category="${e(c)}">${e(c)}</button>`).join('')}</div><div class="pos-products" id="posProducts">${shown.map(p=>`<button class="pos-card" data-search-row="pos-products" data-search-text="${e((p.name+' '+p.sku+' '+p.category).toLowerCase())}" data-action="add-cart" data-id="${p.id}" style="text-align:left;color:var(--text)"><div class="pos-art">${ic('shirt',30)}</div><strong>${e(p.name)}</strong><small>${e(p.sku)} · ${p.stock} in stock</small><div class="pos-bottom"><span class="pos-price">${money(p.price)}</span><span class="add-circle">+</span></div></button>`).join('')||'<div class="empty">No matching in-stock products.</div>'}</div></div></section>
 <section class="panel cart-panel"><div class="panel-head"><div><div class="panel-title">Current bill</div><div class="panel-subtitle">Receipt #'+(1049+sales.length-7)+' · ${cart.reduce((s,i)=>s+i.qty,0)} items</div></div><button class="mini-icon" data-action="clear-cart" aria-label="Clear cart">${ic('trash')}</button></div><div class="cart-items">${cart.length?cart.map(it=>`<div class="cart-item"><div class="cart-item-main"><strong>${e(it.name)}</strong><small>${money(it.price)} / unit</small></div><div class="qty-control"><button data-action="cart-qty" data-id="${it.id}" data-delta="-1">−</button><span>${it.qty}</span><button data-action="cart-qty" data-id="${it.id}" data-delta="1">+</button></div><div class="cart-price">${money(it.price*it.qty)}</div></div>`).join(''):'<div class="empty" style="padding:28px 5px">'+ic('cart',24)+'<strong>Your bill is empty</strong>Add products to begin a sale.</div>'}</div>
 <div class="cart-fields"><div class="field-group"><label for="customerSelect">Customer</label><select id="customerSelect"><option value="Walk-in customer">Walk-in customer</option>${customers.map(c=>`<option value="${e(c.name)}">${e(c.name)}</option>`).join('')}</select></div><div class="field-group"><label for="paymentSelect">Payment method</label><select id="paymentSelect"><option>Cash</option><option>Card</option><option>Credit</option></select></div><div class="field-group"><label for="discountInput">Discount (PKR)</label><input id="discountInput" type="number" min="0" max="${subtotal}" value="0" placeholder="0" data-role="discount" ${storeSettings.allow_discounts?'':'disabled'}></div></div>
 <div class="cart-totals"><div class="total-row"><span>Subtotal</span><strong>${money(subtotal)}</strong></div><div class="total-row"><span>Discount</span><strong>${money(discount)}</strong></div><div class="total-row grand"><span>Total due</span><strong>${money(total)}</strong></div><button class="btn primary full" data-action="checkout" ${cart.length?'':'disabled'}>${ic('check')} Complete sale</button><div class="receipt-note">${ic('receipt',13)} Receipt will be generated on completion</div></div></section></div><div class="footer-note">Payment method is recorded; no payment gateway is connected.</div>`;
}
function salesPage(){
 const matches=sales.filter(s=>salesFilter==='All'||s.payment===salesFilter||s.status===salesFilter);
 return head('sales',`<button class="btn" data-action="export-sales">${ic('download')} Export</button><button class="btn primary" data-nav="billing">${ic('plus')} New sale</button>`)+
 `<div class="stats-grid grid">${stat('Total sales',sales.length,'receipt','Sales loaded for this store')}${stat('Sales revenue',money(sales.reduce((s,a)=>s+a.total,0)),'wallet','Recorded transactions')}${stat('Credit outstanding',money(customers.reduce((s,c)=>s+c.balance,0)),'people','Customer balances')}${stat('Completed orders',sales.filter(s=>s.status==='Completed').length,'check','Ready receipts')}</div>
 <section class="panel"><div class="table-toolbar"><div class="filter-tabs">${['All','Cash','Card','Credit','Pending','Completed'].map(f=>`<button class="${salesFilter===f?'active':''}" data-action="sales-filter" data-filter="${f}">${f}</button>`).join('')}</div><div class="field-search">${ic('search')}<input type="search" data-local-search="sales" placeholder="Search receipt or customer…"></div></div><div class="table-wrap"><table style="min-width:790px"><thead><tr><th>Receipt</th><th>Customer</th><th>Date & time</th><th>Payment</th><th>Total</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead><tbody>${matches.map(salesRow).join('')||`<tr><td colspan="7"><div class="empty">No sales match this filter.</div></td></tr>`}</tbody></table></div><div class="pagination"><span>Sales and receipts loaded for this store.</span><span class="page-n">${matches.length} transactions</span></div></section>`;
}
function customersPage(){
 const rows=customers.map(c=>`<tr data-search-row="customers" data-search-text="${e((c.name+' '+c.phone+' '+c.email).toLowerCase())}"><td><div class="product-cell"><div class="person-avatar">${e(c.name.split(' ').map(a=>a[0]).slice(0,2).join(''))}</div><div><strong>${e(c.name)}</strong><small>Customer since ${dateShort(c.joined)}</small></div></div></td><td>${e(c.phone)}</td><td>${c.orders}</td><td><strong>${money(c.balance)}</strong></td><td>${c.balance?'<span class="badge warn">Balance due</span>':'<span class="badge good">Clear</span>'}</td><td><div class="row-actions"><button class="mini-icon" data-action="view-customer" data-id="${c.id}" aria-label="View customer">${ic('eye')}</button>${c.balance>0?`<button class="btn small" data-action="record-khata-payment" data-id="${c.id}">Collect</button>`:''}<button class="mini-icon" data-action="edit-customer" data-id="${c.id}" aria-label="Edit customer">${ic('edit')}</button><button class="mini-icon" data-action="delete-customer" data-id="${c.id}" aria-label="Delete customer">${ic('trash')}</button></div></td></tr>`).join('');
 return head('customers',`<button class="btn" data-action="export-customers">${ic('download')} Export</button><button class="btn primary" data-action="add-customer">${ic('plus')} Add customer</button>`)+
 `<div class="stats-grid grid">${stat('Total customers',customers.length,'people','Returning and walk-in')}${stat('Outstanding khata',money(customers.reduce((s,c)=>s+c.balance,0)),'wallet','Unpaid customer balances')}${stat('Clear accounts',customers.filter(c=>!c.balance).length,'check','No balance due')}${stat('Repeat customers',customers.filter(c=>c.orders>4).length,'refresh','More than 4 orders')}</div><section class="panel"><div class="table-toolbar"><div><strong style="font-size:12px">Customer directory</strong><div class="panel-subtitle">Contact information, order history, and credit balance</div></div><div class="field-search">${ic('search')}<input type="search" data-local-search="customers" placeholder="Find customer…"></div></div><div class="table-wrap"><table style="min-width:800px"><thead><tr><th>Customer</th><th>Phone</th><th>Orders</th><th>Khata balance</th><th>Account</th><th style="text-align:right">Actions</th></tr></thead><tbody>${rows||''}</tbody></table></div></section>`;
}
function suppliersPage(){
 const rows=suppliers.map(s=>`<tr data-search-row="suppliers" data-search-text="${e((s.name+' '+s.contact+' '+s.category+' '+s.phone).toLowerCase())}"><td><div class="product-cell"><div class="person-avatar">${e(s.name.split(' ').map(a=>a[0]).slice(0,2).join(''))}</div><div><strong>${e(s.name)}</strong><small>${e(s.category)}</small></div></div></td><td>${e(s.contact)}</td><td>${e(s.phone)}</td><td><strong>${money(s.balance)}</strong></td><td>${s.balance?'<span class="badge warn">Outstanding</span>':'<span class="badge good">Settled</span>'}</td><td><div class="row-actions">${s.balance>0?`<button class="btn small" data-action="record-supplier-payment" data-id="${s.id}">Pay</button>`:''}${window.MA_STORE?.role==="owner"?`<button class="mini-icon" data-action="adjust-supplier" data-id="${s.id}" aria-label="Adjust balance">${ic('wallet')}</button>`:``}<button class="mini-icon" data-action="edit-supplier" data-id="${s.id}" aria-label="Edit supplier">${ic('edit')}</button><button class="mini-icon" data-action="delete-supplier" data-id="${s.id}" aria-label="Delete supplier">${ic('trash')}</button></div></td></tr>`).join('');
 return head('suppliers',`<button class="btn" data-action="export-suppliers">${ic('download')} Export</button><button class="btn primary" data-action="add-supplier">${ic('plus')} Add supplier</button>`)+
 `<div class="stats-grid grid">${stat('Active suppliers',suppliers.length,'truck','Fabric and merchandise vendors')}${stat('Supplier balances',money(suppliers.reduce((s,a)=>s+a.balance,0)),'wallet','Outstanding payables')}${stat('Purchase orders',purchaseOrders.length,'receipt','Orders tracked')}${stat('To receive',purchaseOrders.filter(p=>p.status==='Pending').length,'box','Open purchase orders')}</div><section class="panel"><div class="table-toolbar"><div><strong style="font-size:12px">Supplier directory</strong><div class="panel-subtitle">Vendors, contact information, and balances</div></div><div class="field-search">${ic('search')}<input type="search" data-local-search="suppliers" placeholder="Find a supplier…"></div></div><div class="table-wrap"><table style="min-width:780px"><thead><tr><th>Supplier</th><th>Contact person</th><th>Phone</th><th>Balance</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
function categoriesPage(){
 return head('categories',`<button class="btn primary" data-action="add-category">${ic('plus')} Add category</button>`)+`<div class="inline-notice">${ic('info')}<div>Use categories to keep your clothing catalog tidy. Product counts are recalculated as you add or edit items.</div></div><div class="category-grid">${categories.map(c=>`<div class="category-card"><div class="category-symbol">${ic(c.name==='Accessories'?'spark':c.name==='Ready to wear'?'shirt':'tag')}</div><strong>${e(c.name)}</strong><small>${products.filter(p=>p.category===c.name).length} products · ${e(c.description)}</small><div style="display:flex;justify-content:flex-end;gap:5px;margin-top:14px"><button class="mini-icon" data-action="edit-category" data-name="${e(c.name)}" aria-label="Edit category">${ic('edit')}</button><button class="mini-icon" data-action="delete-category" data-name="${e(c.name)}" aria-label="Delete category">${ic('trash')}</button></div></div>`).join('')}</div>`;
}

async function loadStoreSettings(){const c=window.MA_SUPABASE,s=window.MA_STORE,generation=storeDataGeneration;if(!c||!s?.id)return;const {data,error}=await c.from('store_settings').select('show_sku,warn_low_stock,ask_customer_each_sale,allow_discounts,show_receipt_after_checkout,default_min_stock,stock_unit,compact_tables,receipt_footer').eq('store_id',s.id).maybeSingle();if(error)throw error;if(!isCurrentStoreLoad(s.id,generation))return;if(data)storeSettings={...DEFAULT_STORE_SETTINGS,...data};}
async function saveStoreSettings(patch){const c=window.MA_SUPABASE,s=window.MA_STORE;if(!c||!s?.id||s.role!=='owner'){toast('Only the owner can save store preferences.');return false;}const {data,error}=await c.from('store_settings').update(patch).eq('store_id',s.id).select('*').maybeSingle();if(window.MA_STORE?.id!==s.id)return false;if(error||!data){toast(error?.message||'Settings were not saved.');return false;}storeSettings={...storeSettings,...data};renderPage();toast('Store preferences saved.');return true;}async function loadCustomersFromDatabase(){
 const c=window.MA_SUPABASE,s=window.MA_STORE,generation=storeDataGeneration;if(!c||!s?.id)return;
 const {data,error}=await c.from('customers').select('id,name,phone,email,khata_balance,order_count,created_at').eq('store_id',s.id).eq('is_active',true).order('created_at',{ascending:false});if(error)throw error;
 if(!isCurrentStoreLoad(s.id,generation))return;
 customers.splice(0,customers.length,...(data||[]).map(r=>({id:r.id,name:r.name,phone:r.phone||'',email:r.email||'',balance:Number(r.khata_balance),orders:Number(r.order_count),joined:(r.created_at||'').slice(0,10)})));
}
async function loadKhataLedgerFromDatabase(){
 const c=window.MA_SUPABASE,s=window.MA_STORE,generation=storeDataGeneration;if(!c||!s?.id||!['owner','manager'].includes(s.role))return;
 const {data,error}=await c.from('khata_entries').select('id,customer_id,entry_type,amount_change,payment_id,note,created_at').eq('store_id',s.id).order('created_at',{ascending:false}).limit(1000);if(error)throw error;
 if(!isCurrentStoreLoad(s.id,generation))return;
 khataLedger.splice(0,khataLedger.length,...(data||[]).map(r=>({id:r.id,customerId:r.customer_id,type:r.entry_type==='credit_sale'?'charge':'payment',amount:Math.abs(Number(r.amount_change)),paymentId:r.payment_id||null,note:r.note||'',date:r.created_at})));
}
async function loadSalesFromDatabase(){
 const c=window.MA_SUPABASE,s=window.MA_STORE,generation=storeDataGeneration;if(!c||!s?.id)return;
 const {data,error}=await c.from('sales').select('id,sale_number,customer_name,customer_phone,sold_at,subtotal,discount,total,payment_method,status').eq('store_id',s.id).order('sold_at',{ascending:false}).limit(500);if(error)throw error;
 if(!isCurrentStoreLoad(s.id,generation))return;
 const ids=(data||[]).map(x=>x.id);let lines=[];if(ids.length){const result=await c.from('sale_items').select('sale_id,product_id,product_name,quantity,unit_price').eq('store_id',s.id).in('sale_id',ids);if(result.error)throw result.error;lines=result.data||[];}
 if(!isCurrentStoreLoad(s.id,generation))return;
 const paymentsMap=new Map();if(ids.length){const p=await c.from('sale_payments').select('sale_id,method,amount,reference,created_at').eq('store_id',s.id).in('sale_id',ids);if(!p.error)(p.data||[]).forEach(x=>{if(!paymentsMap.has(x.sale_id))paymentsMap.set(x.sale_id,[]);paymentsMap.get(x.sale_id).push(x);});}
 if(!isCurrentStoreLoad(s.id,generation))return;
 const allocationsMap=new Map();if(ids.length){const a=await c.from('payment_allocations').select('sale_id,amount,created_at').eq('store_id',s.id).in('sale_id',ids);if(!a.error)(a.data||[]).forEach(x=>{if(!allocationsMap.has(x.sale_id))allocationsMap.set(x.sale_id,[]);allocationsMap.get(x.sale_id).push({amount:Number(x.amount||0),date:x.created_at});});}
 if(!isCurrentStoreLoad(s.id,generation))return;
 const financial=new Map();if(['owner','manager'].includes(s.role)){const f=await c.from('sales_financials').select('id,profit').eq('store_id',s.id).in('id',ids);if(!f.error)(f.data||[]).forEach(x=>financial.set(x.id,Number(x.profit)||0));}
 if(!isCurrentStoreLoad(s.id,generation))return;
 sales.splice(0,sales.length,...(data||[]).map(r=>({id:r.sale_number,dbId:r.id,customer:r.customer_name,date:r.sold_at,total:Number(r.total),subtotal:Number(r.subtotal),discount:Number(r.discount),payment:r.payment_method==='credit'?'Credit':r.payment_method[0].toUpperCase()+r.payment_method.slice(1),status:r.status[0].toUpperCase()+r.status.slice(1),profit:financial.get(r.id)||0,paymentDetails:paymentsMap.get(r.id)||[],allocations:allocationsMap.get(r.id)||[],items:lines.filter(i=>i.sale_id===r.id).map(i=>({productId:i.product_id,name:i.product_name,qty:i.quantity,price:Number(i.unit_price)}))})));
}
async function openSaleDetails(sale){const c=window.MA_SUPABASE,store=window.MA_STORE;if(!c||!store?.id||!sale?.dbId){if(sale)openReceipt(sale);return;}try{const [items,payments,ledger]=await Promise.all([c.from('sale_items').select('product_name,sku,quantity,unit_price,line_total').eq('store_id',store.id).eq('sale_id',sale.dbId),c.from('sale_payments').select('method,amount,reference,created_at').eq('store_id',store.id).eq('sale_id',sale.dbId),c.from('khata_entries').select('entry_type,amount_change,balance_after,note,created_at').eq('store_id',store.id).eq('sale_id',sale.dbId)]);for(const r of [items,payments,ledger])if(r.error)throw r.error;if(window.MA_STORE?.id!==store.id)return;sale.items=(items.data||[]).map(x=>({name:x.product_name,qty:x.quantity,price:Number(x.unit_price),sku:x.sku}));sale.paymentDetails=payments.data||[];sale.ledgerEntries=ledger.data||[];openReceipt(sale);}catch(err){toast(err.message||'Sale details could not load.');}}async function loadSuppliersFromDatabase(){const c=window.MA_SUPABASE,s=window.MA_STORE,generation=storeDataGeneration;if(!c||!s?.id||s.role==='cashier')return;const {data,error}=await c.from('suppliers').select('id,name,contact_person,phone,category,payable_balance').eq('store_id',s.id).eq('is_active',true).order('name');if(error)throw error;if(!isCurrentStoreLoad(s.id,generation))return;suppliers.splice(0,suppliers.length,...(data||[]).map(r=>({id:r.id,name:r.name,contact:r.contact_person||'',phone:r.phone||'',category:r.category||'',balance:Number(r.payable_balance)})));}
async function loadExpensesFromDatabase(){const c=window.MA_SUPABASE,s=window.MA_STORE,generation=storeDataGeneration;if(!c||!s?.id||s.role==='cashier')return;const {data,error}=await c.from('expenses').select('id,title,category,amount,expense_date,note').eq('store_id',s.id).order('expense_date',{ascending:false});if(error)throw error;if(!isCurrentStoreLoad(s.id,generation))return;expenses.splice(0,expenses.length,...(data||[]).map(r=>({id:r.id,title:r.title,category:r.category,amount:Number(r.amount),date:r.expense_date,note:r.note||''})));}
async function receivePurchaseOrder(po){const c=window.MA_SUPABASE,s=window.MA_STORE;if(!c||!s?.id){toast('Database unavailable.');return;}try{const {error}=await c.rpc('receive_purchase_order',{p_store_id:s.id,p_purchase_order_id:po.id});if(error)throw error;if(window.MA_STORE?.id!==s.id)return;await Promise.all([loadPurchaseOrdersFromDatabase(),loadProductsFromDatabase(),loadSuppliersFromDatabase()]);if(window.MA_STORE?.id!==s.id)return;renderPage();toast('Purchase received; stock and supplier balance updated.');}catch(err){if(window.MA_STORE?.id===s.id)toast(err.message||'Receipt failed.');}}async function loadPurchaseOrdersFromDatabase(){const c=window.MA_SUPABASE,s=window.MA_STORE,generation=storeDataGeneration;if(!c||!s?.id||s.role==='cashier')return;const {data,error}=await c.from('purchase_orders').select('id,po_number,supplier_id,order_date,status,total,suppliers(name),purchase_order_items(id)').eq('store_id',s.id).order('order_date',{ascending:false});if(error)throw error;if(!isCurrentStoreLoad(s.id,generation))return;purchaseOrders.splice(0,purchaseOrders.length,...(data||[]).map(r=>({id:r.id,number:r.po_number,supplier:r.suppliers?.name||'',date:r.order_date,items:r.purchase_order_items?.length||0,total:Number(r.total),status:r.status[0].toUpperCase()+r.status.slice(1),supplierId:r.supplier_id})));}
async function loadEmployeesFromDatabase(){
  const client=window.MA_SUPABASE, store=window.MA_STORE, generation=storeDataGeneration;
  if(!client||!store||!store.id||store.role!=='owner')return;
  employees.splice(0,employees.length);
  try{
    const {data,error}=await client.from('employees')
      .select('id,name,role_title,phone,status,user_id')
      .eq('store_id',store.id).order('created_at',{ascending:false});
    if(error)throw error;
    if(!isCurrentStoreLoad(store.id,generation))return;
    employees.splice(0,employees.length,...(data||[]).map(function(r){
      return {id:r.id,userId:r.user_id||null,name:r.name,role:r.role_title,phone:r.phone||'',
        status:r.status==='inactive'?'Inactive':'Active'};
    }));
  }catch(error){
    if(!isCurrentStoreLoad(store.id,generation))return;
    console.error('Employee load failed:',error);
    toast('Employees could not load. Check database access.');
  }
  if(currentPage==='employees')renderPage();
}
async function deleteEmployeeFromDatabase(id){
  const client=window.MA_SUPABASE, store=window.MA_STORE;
  if(!client||!store||store.role!=='owner'){toast('Owner access required.');return;}
  const x=employees.find(function(a){return String(a.id)===String(id);});
  if(!x||!confirm('Remove employee '+x.name+'?'))return;
  try{
    if(x.userId){
      const invitation=window.MAEmployeeInvitations;
      if(!invitation)throw new Error('Employee access service is unavailable. Reload the application.');
      await invitation.removeEmployee(client,{store_id:store.id,employee_id:String(id)});
    }else{
      const {data,error}=await client.from('employees').delete()
        .eq('id',String(id)).eq('store_id',store.id).select('id').maybeSingle();
      if(error)throw error;
      if(!data)throw new Error('Employee record not found or access denied.');
    }
    if(window.MA_STORE?.id!==store.id)return;
    employees.splice(employees.indexOf(x),1);
    renderPage();
    toast('Employee removed.');
  }catch(error){
    console.error('Employee delete failed:',error);
    const invitation=window.MAEmployeeInvitations;
    toast(x.userId&&invitation?invitation.errorMessage(error,'remove'):'Could not remove employee. Check owner permissions.');
  }
}

function employeesPage(){
 const rows=employees.map(x=>`<tr data-search-row="employees" data-search-text="${e((x.name+' '+x.role+' '+x.phone).toLowerCase())}"><td><div class="product-cell"><div class="person-avatar">${e(x.name.split(' ').map(a=>a[0]).slice(0,2).join(''))}</div><div><strong>${e(x.name)}</strong><small>Staff ID EMP-${String(x.id).slice(0,8).toUpperCase()}</small></div></div></td><td>${e(x.role)}</td><td>${e(x.phone)}</td><td><span class="badge good">${x.status}</span></td><td><div class="row-actions"><button class="mini-icon" data-action="edit-employee" data-id="${x.id}">${ic('edit')}</button><button class="mini-icon" data-action="delete-employee" data-id="${x.id}">${ic('trash')}</button></div></td></tr>`).join('');
 return head('employees',`<button class="btn primary" data-action="add-employee">${ic('plus')} Add employee</button>`)+`<section class="panel">${tablePanel('',`${employees.length} team members`,['Employee','Role','Phone','Status','Actions'],rows,'No employees')}</section>`;
}
function purchaseOrdersPage(){
 const rows=purchaseOrders.map(p=>`<tr data-search-row="purchase-orders" data-search-text="${e((p.id+' '+p.supplier+' '+p.status).toLowerCase())}"><td><strong>PO-${p.id}</strong></td><td>${e(p.supplier)}</td><td>${dateShort(p.date)}</td><td>${p.items} products</td><td><strong>${money(p.total)}</strong></td><td>${p.status==='Received'?'<span class="badge good">Received</span>':p.status==='Cancelled'?'<span class="badge">Cancelled</span>':'<span class="badge warn">Pending</span>'}</td><td><div class="row-actions">${p.status==='Pending'?`<button class="btn small" data-action="receive-po" data-id="${p.id}">${ic('check')} Mark received</button><button class="mini-icon" data-action="cancel-po" data-id="${p.id}" aria-label="Cancel order">${ic('close')}</button>`:''}</div></td></tr>`).join('');
 return head('purchase-orders',`<button class="btn primary" data-action="add-po">${ic('plus')} Create purchase order</button>`)+`<div class="stats-grid grid">${stat('Total orders',purchaseOrders.length,'receipt','All purchase orders')}${stat('Awaiting delivery',purchaseOrders.filter(p=>p.status==='Pending').length,'truck','Items to receive')}${stat('Ordered value',money(purchaseOrders.reduce((s,p)=>s+p.total,0)),'wallet','Sum of order totals')}${stat('Received orders',purchaseOrders.filter(p=>p.status==='Received').length,'check','Completed deliveries')}</div><section class="panel"><div class="table-toolbar"><div><strong style="font-size:12px">Purchase order register</strong><div class="panel-subtitle">Replenishment orders for your store</div></div><div class="field-search">${ic('search')}<input type="search" data-local-search="purchase-orders" placeholder="Search PO or supplier…"></div></div><div class="table-wrap"><table style="min-width:800px"><thead><tr><th>Order ID</th><th>Supplier</th><th>Date</th><th>Products</th><th>Order total</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
function expensesPage(){
 const total=expenses.reduce((s,x)=>s+x.amount,0);
 const now=new Date(), monthTotal=expenses.filter(x=>{const d=new Date(String(x.date)+'T00:00:00');return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()}).reduce((s,x)=>s+x.amount,0);
 const rows=expenses.map(x=>`<tr data-search-row="expenses" data-search-text="${e((x.title+' '+x.category+' '+x.note).toLowerCase())}"><td><div><strong>${e(x.title)}</strong><div class="panel-subtitle">${e(x.note)}</div></div></td><td>${e(x.category)}</td><td>${dateShort(x.date)}</td><td><strong>${money(x.amount)}</strong></td><td><div class="row-actions"><button class="mini-icon" data-action="edit-expense" data-id="${x.id}">${ic('edit')}</button><button class="mini-icon" data-action="delete-expense" data-id="${x.id}">${ic('trash')}</button></div></td></tr>`).join('');
 return head('expenses',`<button class="btn" data-action="export-expenses">${ic('download')} Export</button><button class="btn primary" data-action="add-expense">${ic('plus')} Add expense</button>`)+`<div class="stats-grid grid">${stat('Total expenses',money(total),'wallet','All recorded expenses')}${stat('This month',money(monthTotal),'calendar','Recorded in current month')}${stat('Largest expense',money(Math.max(...expenses.map(x=>x.amount),0)),'chart','Single expense record')}${stat('Expense entries',expenses.length,'receipt','All categories')}</div><section class="panel"><div class="table-toolbar"><div><strong style="font-size:12px">Expense register</strong><div class="panel-subtitle">Rent, utilities, supplies, and other costs</div></div><div class="field-search">${ic('search')}<input type="search" data-local-search="expenses" placeholder="Search expenses…"></div></div><div class="table-wrap"><table style="min-width:690px"><thead><tr><th>Expense</th><th>Category</th><th>Date</th><th>Amount</th><th style="text-align:right">Actions</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
function reportsPage(){
 const now=new Date(), start=new Date(now);if(reportPeriod==='Last 7 days')start.setDate(now.getDate()-6);else if(reportPeriod==='This year')start.setMonth(0,1);else start.setDate(1);
 const periodSales=sales.filter(x=>new Date(x.date)>=start&&new Date(x.date)<=now);
 const gross=periodSales.reduce((sum,x)=>sum+x.total,0), profit=periodSales.reduce((sum,x)=>sum+x.profit,0), stockVal=products.reduce((sum,p)=>sum+p.cost*p.stock,0);
 const cats=categories.map(c=>({name:c.name,amount:products.filter(p=>p.category===c.name).reduce((sum,p)=>sum+p.price*p.stock,0)}));
 const periods=['This month','Last 7 days','This year'];
 return head('reports',`<select class="control" id="reportPeriod">${periods.map(x=>`<option ${x===reportPeriod?'selected':''}>${x}</option>`).join('')}</select><button class="btn" data-action="export-report">${ic('download')} Export report</button>`)+
 `<div class="metric-cards">${stat('Gross revenue',money(gross),'wallet',`${periodSales.length} sales in ${reportPeriod.toLowerCase()}`)}${stat('Gross profit',money(profit),'chart',`${gross?Math.round(profit/gross*100):0}% margin`)}${stat('Stock cost value',money(stockVal),'layers','Current on-hand inventory')}</div>
 <div class="two-col" style="margin-bottom:16px"><section class="panel"><div class="panel-head"><div><div class="panel-title">Revenue & profit</div><div class="panel-subtitle">${e(reportPeriod)} performance from recorded sales</div></div></div><div class="panel-body"><div class="chart-total">${money(gross)} <span>total revenue</span></div><div class="report-chart">${Array.from({length:12},(_,i)=>{const begin=new Date(start),end=new Date(now);const span=Math.max(1,end-begin);const x0=new Date(begin.getTime()+span*i/12),x1=new Date(begin.getTime()+span*(i+1)/12);const value=periodSales.filter(s=>new Date(s.date)>=x0&&new Date(s.date)<x1).reduce((sum,s)=>sum+s.total,0);const h=gross?Math.max(3,value/gross*100):0;return `<div class="report-bar-group"><div class="report-bar" style="height:${h}%"></div><div class="report-bar accent" style="height:${Math.min(100,h*(gross?profit/gross:0))}%"></div></div>`}).join('')}</div></div></section>
 <section class="panel"><div class="panel-head"><div><div class="panel-title">Revenue by category</div><div class="panel-subtitle">Current stock value at retail price</div></div></div><div class="panel-body"><div class="report-list">${cats.map((c,i)=>`<div><div class="report-list-row"><span>${e(c.name)}</span><strong>${money(c.amount)}</strong></div><div class="progress" style="margin-top:8px"><span style="width:${Math.min(100,cats.reduce((sum,v)=>sum+v.amount,0)?c.amount/cats.reduce((sum,v)=>sum+v.amount,0)*100:0)}%;background:${['var(--accent)','var(--olive)','var(--gold)','var(--surface-3)'][i%4]}"></span></div></div>`).join('')}</div></div></section></div>
 <div class="two-col"><section class="panel"><div class="panel-head"><div><div class="panel-title">Payment breakdown</div><div class="panel-subtitle">${e(reportPeriod)}</div></div></div><div class="panel-body"><div class="report-list">${['Cash','Card','Online','Credit'].map((method,i)=>{const n=periodSales.filter(s=>s.payment===method).reduce((sum,s)=>sum+s.total,0);return `<div><div class="report-list-row"><span>${method}</span><strong>${money(n)}</strong></div><div class="progress" style="margin-top:8px"><span style="width:${gross?n/gross*100:0}%;background:${['var(--olive)','var(--accent)','var(--surface-3)','var(--gold)'][i]}"></span></div></div>`}).join('')}</div></div></section><section class="panel"><div class="panel-head"><div><div class="panel-title">Stock alerts</div><div class="panel-subtitle">Items at or below minimum stock</div></div><button class="btn ghost small" data-nav="inventory">View stock ${ic('arrow',12)}</button></div><div class="panel-body"><div class="sales-list">${products.filter(p=>p.stock<=p.minStock).slice(0,4).map(p=>`<div class="sale-row"><div class="sale-product-icon">${ic('shirt')}</div><div class="sale-meta"><strong>${e(p.name)}</strong><span>${e(p.sku)}</span></div><div class="sale-amount">${p.stock} left<small>Min. ${p.minStock}</small></div></div>`).join('')||'<div class="empty">All items are above minimum stock.</div>'}</div></div></section></div>`;
}
/* MA_STATIC_LOGO: path to the bundled logo asset relative to index.html */
const MA_STATIC_LOGO='./frontend/assets/ma-collection-logo.png';
function storeLogoUrl(){
  return MA_STATIC_LOGO;
}
function applyStoreBranding(){
  const s=window.MA_STORE, url=storeLogoUrl();
  ['.brand-mark','.store-avatar','.user-photo'].forEach(sel=>{
    const el=document.querySelector(sel);
    if(!el)return;
    /* Always display the logo image (static asset or Supabase URL) */
    if(!el.querySelector('img')||el.querySelector('img').src!==url){
      const img=document.createElement('img');
      img.src=url; img.alt=(s?.name||'MA Collection')+' logo';
      img.style.cssText='width:100%;height:100%;object-fit:contain;border-radius:inherit';
      el.replaceChildren(img); el.style.overflow='hidden';
    }
  });
  const label=document.querySelector('.store-meta strong');
  if(label)label.textContent=s?.name||'MA Collection';
  const type=document.querySelector('.store-meta span');
  if(type)type.textContent=s?.business_type||'Clothing & garments';
}
function settingsPage(){
 const tabs=['Store profile','Sales preferences','Inventory','Appearance','Data & privacy'];
 let panel='';
 if(currentSettingsTab==='Store profile') panel=`<div class="settings-block"><h3>Store details</h3><p>These details appear on receipts and help identify your shop in this workspace.</p><form id="storeSettingsForm"><div class="form-grid"><div><label>Store name</label><input name="storeName" value="MA Collection" required></div><div><label>Business type</label><select name="businessType"><option>Clothing & garments</option><option>Retail boutique</option><option>Accessories</option></select></div><div><label>Phone number</label><input name="phone" value="0300 123 4567"></div><div><label>Currency</label><select name="currency"><option>PKR — Pakistani Rupee</option></select></div><div class="full-span"><label>Store address</label><input name="address" value="Gulberg, Lahore, Pakistan"></div></div><div style="display:flex;justify-content:flex-end;margin-top:17px"><button class="btn primary">Save changes</button></div></form></div><div class="settings-block"><h3>Store preferences</h3><p>Small defaults for your daily counter workflow.</p><div class="switch-row"><div><strong>Show SKU on product list</strong><small>Display internal product codes below item names.</small></div><button class="toggle ${storeSettings.show_sku?"on":""}" data-action="toggle-setting"><span></span></button></div><div class="switch-row"><div><strong>Warn when stock is low</strong><small>Flag products at or below their minimum quantity.</small></div><button class="toggle ${storeSettings.warn_low_stock?"on":""}" data-action="toggle-setting"><span></span></button></div></div>`;
 else if(currentSettingsTab==='Sales preferences') panel=`<div class="settings-block"><h3>Billing defaults</h3><p>Customize billing behavior for this store.</p><div class="switch-row"><div><strong>Ask for customer on each sale</strong><small>Walk-in customer is still available.</small></div><button class="toggle ${storeSettings.ask_customer_each_sale?"on":""}" data-action="toggle-setting"><span></span></button></div><div class="switch-row"><div><strong>Allow discounts</strong><small>Disable this to keep all sale discounts at zero.</small></div><button class="toggle ${storeSettings.allow_discounts?"on":""}" data-action="toggle-setting"><span></span></button></div><div class="switch-row"><div><strong>Show receipt after checkout</strong><small>Open a receipt preview when the sale is completed.</small></div><button class="toggle ${storeSettings.show_receipt_after_checkout?"on":""}" data-action="toggle-setting"><span></span></button></div></div>`;
 else if(currentSettingsTab==='Inventory') panel=`<div class="settings-block"><h3>Stock management</h3><p>Manage the default behavior for your clothing inventory.</p><div class="form-grid"><div><label>Default minimum stock</label><input type="number" min="0" value="${storeSettings.default_min_stock}" id="defaultMinStock"></div><div><label>Stock unit</label><select id="stockUnit"><option ${storeSettings.stock_unit==="Pieces"?"selected":""}>Pieces</option><option ${storeSettings.stock_unit==="Sets"?"selected":""}>Sets</option><option ${storeSettings.stock_unit==="Bundles"?"selected":""}>Bundles</option></select></div></div><div class="switch-row"><div><strong>Negative inventory</strong><small>Stock cannot fall below zero.</small></div><span class="badge good">Blocked</span></div><div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn primary" data-action="save-inventory-settings">Save preferences</button></div></div>`;
 else if(currentSettingsTab==='Appearance') panel=`<div class="settings-block"><h3>Appearance</h3><p>MA Collection uses a calm, light interface with warm neutral accents.</p><div class="switch-row"><div><strong>Dark appearance preview</strong><small>Toggle the preview's color scheme for your environment.</small></div><button class="toggle ${themeDark?'on':''}" data-action="toggle-theme"><span></span></button></div><div class="switch-row"><div><strong>Compact tables</strong><small>Keep lists dense for quicker scanning.</small></div><button class="toggle ${storeSettings.compact_tables?"on":""}" data-action="toggle-setting"><span></span></button></div></div>`;
 else panel=`<div class="settings-block"><h3>Store data & privacy</h3><p>Business records are stored by store in Supabase and access is controlled by your signed-in account and role.</p><div class="inline-notice">${ic('info')}<div>CSV exports are generated in this browser from the records currently loaded for this store. Keep exported files private and secure.</div></div></div><div class="settings-block"><h3>Data tools</h3><p>Export loaded store records to a CSV file on this device.</p><button class="btn" data-action="export-products">Export product catalog</button> <button class="btn" data-action="export-sales">Export sales</button></div>`;
 return head('settings')+`<div class="settings-layout"><section class="panel settings-nav">${tabs.map(t=>`<button class="${currentSettingsTab===t?'active':''}" data-action="settings-tab" data-tab="${e(t)}">${ic(t==='Store profile'?'user':t==='Sales preferences'?'receipt':t==='Inventory'?'layers':t==='Appearance'?'spark':'info')}${e(t)}</button>`).join('')}</section><section class="panel"><div class="panel-head"><div><div class="panel-title">${e(currentSettingsTab)}</div><div class="panel-subtitle">Workspace configuration</div></div></div>${panel}</section></div>`;
}
function renderPage(){
  applyStoreBranding();
  if (!currentRole()) { $('#navContainer').innerHTML=''; $('#mobileBottom').innerHTML=''; $('#pageContent').innerHTML=''; return; }
 if (!canAccessPage(currentPage)) currentPage = ROLE_PAGE_ACCESS[currentRole()][0];
 try { sessionStorage.setItem('maCollectionCurrentPage', currentPage); } catch (_) {}
 renderNav();
 const titles=pageMeta[currentPage]||pageMeta.dashboard; $('#topTitle').textContent=titles[0];
 const pages={dashboard:dashboardPage,billing:billingPage,sales:salesPage,products:productsPage,inventory:inventoryPage,categories:categoriesPage,customers:customersPage,suppliers:suppliersPage,employees:employeesPage,'purchase-orders':purchaseOrdersPage,expenses:expensesPage,reports:reportsPage,settings:settingsPage};
 $('#pageContent').innerHTML=(pages[currentPage]||dashboardPage)();
 const profileForm=$('#storeSettingsForm');
 if(profileForm && window.MA_STORE) {
   const f=profileForm.elements;
   if(f.storeName) f.storeName.value=window.MA_STORE.name || '';
   if(f.businessType) f.businessType.value=window.MA_STORE.business_type || 'Clothing & garments';
   if(f.phone) f.phone.value=window.MA_STORE.phone || '';
   if(f.address) f.address.value=window.MA_STORE.address || '';
 }
  applyStoreBranding();
  hideForbiddenActions($('#pageContent'));
 $('#globalSearch').value='';
 document.title='MA Collection — '+titles[0];
}
function navigate(page){if(!pageMeta[page]) return;if(!canAccessPage(page)){toast('You do not have permission to open this page.');return;}currentPage=page;try{sessionStorage.setItem('maCollectionCurrentPage',page);}catch(_){}closeMenu();renderPage();window.scrollTo({top:0,behavior:'smooth'});}
function toast(message){const n=document.createElement('div');n.className='toast';n.innerHTML=`<span class="toast-mark">✓</span><span>${e(message)}</span>`;$('#toastWrap').appendChild(n);setTimeout(()=>n.remove(),2800);}
function showModal(title,subtitle,body,opts={}){$('#modalHost').innerHTML=`<div class="modal-backdrop" data-action="backdrop-close"><section class="modal ${opts.wide?'wide':''}" role="dialog" aria-modal="true" aria-label="${e(title)}"><div class="modal-head"><div><h2>${e(title)}</h2><p>${e(subtitle||'')}</p></div><button class="modal-close" data-action="close-modal" aria-label="Close">×</button></div><div class="modal-body">${body}</div>${opts.footer===false?'':`<div class="modal-foot">${opts.cancel===false?'':`<button class="btn" data-action="close-modal">Cancel</button>`}${opts.submit?`<button class="btn primary" data-action="modal-submit" data-submit-form="${opts.formId||'modalForm'}">${opts.submit}</button>`:''}</div>`}</section></div>`; const inp=$('input,select,textarea',$('#modalHost')); if(inp) inp.focus();}
function closeModal(){$('#modalHost').innerHTML='';}
function closeMenu(){$('#sidebar').classList.remove('open');$('#mobileOverlay').classList.remove('show');}
function toggleMenu(){const open=!$('#sidebar').classList.contains('open');$('#sidebar').classList.toggle('open',open);$('#mobileOverlay').classList.toggle('show',open);}
function findById(list,id){return list.find(x=>String(x.id)===String(id));}
function field(label,name,value='',type='text',required=false,placeholder=''){return `<div><label>${e(label)}${required?' <span class="required">*</span>':''}</label><input name="${e(name)}" type="${type}" value="${e(value)}" ${required?'required':''} placeholder="${e(placeholder)}"></div>`;}
function selectField(label,name,options,current){return `<div><label>${e(label)}</label><select name="${e(name)}">${options.map(v=>`<option ${v===current?'selected':''}>${e(v)}</option>`).join('')}</select></div>`;}
async function loadProductsFromDatabase(){
  const client=window.MA_SUPABASE, store=window.MA_STORE, generation=storeDataGeneration;
  if(!client||!store||!store.id)return;

  try{
    const {data:categoryRows,error:categoryError}=await client
      .from('categories').select('id,name,description')
      .eq('store_id',store.id).order('name',{ascending:true});
    if(categoryError)throw categoryError;
    if(!isCurrentStoreLoad(store.id,generation))return;

    const dbCategories=Array.isArray(categoryRows)?categoryRows:[];
    categories.splice(0,categories.length,...dbCategories.map(c=>({
      id:c.id,name:c.name,description:c.description||'',count:0
    })));

    const {data:rows,error:productsError}=await client
      .from('products')
      .select('id,store_id,category_id,name,sku,price,stock_quantity,min_stock,color,size,is_active,created_at')
      .eq('store_id',store.id).eq('is_active',true)
      .order('created_at',{ascending:false});
    if(productsError)throw productsError;
    if(!isCurrentStoreLoad(store.id,generation))return;

    const costMap=new Map();
    if(['owner','manager'].includes(store.role)){
      const {data:costRows,error:costError}=await client.rpc('get_product_costs',{p_requested_store_id:store.id});
      if(costError)console.warn('Product costs unavailable; catalog will still load:',costError);
      if(!isCurrentStoreLoad(store.id,generation))return;
      (costRows||[]).forEach(c=>costMap.set(String(c.id),Number(c.cost)||0));
    }

    const categoryNames=new Map(dbCategories.map(c=>[String(c.id),c.name]));
    const loaded=(rows||[]).map(r=>({
      id:r.id,
      name:r.name,
      sku:r.sku||'',
      category:categoryNames.get(String(r.category_id))||'Uncategorized',
      price:Number(r.price),
      cost:costMap.get(String(r.id))||0,
      stock:Number(r.stock_quantity),
      minStock:Number(r.min_stock),
      color:r.color||'',
      size:r.size||''
    }));

    loaded.forEach(p=>{
      if(!categories.some(c=>c.name===p.category)){
        categories.push({name:p.category,description:'',count:0});
      }
    });

    products.splice(0,products.length,...loaded);
    categories.forEach(c=>c.count=products.filter(p=>p.category===c.name).length);
    renderPage();
    console.log('Products loaded from Supabase:',products.length);
  }catch(error){
    if(!isCurrentStoreLoad(store.id,generation))return;
    console.error('Products database load failed:',error);
    products.splice(0,products.length);
    categories.forEach(c=>c.count=0);
    renderPage();
    toast('Products could not load from database. Check console and database permissions.');
  }
}

async function archiveProductFromDatabase(p){
  if(!confirm('Remove '+p.name+' from the active catalog? Sales history will be retained.'))return;
  const client=window.MA_SUPABASE, store=window.MA_STORE;
  if(!client||!store||!store.id){toast('Database connection is not ready.');return;}
  if(!['owner','manager'].includes(store.role)){toast('Owner or manager access required.');return;}

  try{
    const {error}=await client.rpc('archive_product',{
      p_store_id:store.id,
      p_product_id:p.id
    });
    if(error)throw error;

    const index=products.findIndex(x=>String(x.id)===String(p.id));
    if(index>=0)products.splice(index,1);
    categories.forEach(c=>c.count=products.filter(x=>x.category===c.name).length);
    renderPage();
    toast('Product removed from the active catalog.');
  }catch(error){
    console.error('Product archive failed:',error);
    toast('Could not remove product: '+(error.message||'Database error'));
  }
}
function generateSku(){
  let sku;
  do {
    sku='MA-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,6).toUpperCase();
  } while(products.some(p=>String(p.sku).toLowerCase()===sku.toLowerCase()));
  return sku;
}
function productForm(p={}){const edit=!!p.id;const categoryOptions=categories.map(c=>c.name);if(p.category&&!categoryOptions.includes(p.category))categoryOptions.push(p.category);if(!categoryOptions.length)categoryOptions.push('Unstitched');if(!categoryOptions.includes('Custom/Other'))categoryOptions.push('Custom/Other');const selectedCategory=p.category||categories[0]?.name||categoryOptions[0]||'Unstitched';const customCategoryVisible=selectedCategory==='Custom/Other';showModal(edit?'Edit product':'Add new product',edit?'Update details for this catalog item.':'Add an item to the MA Collection catalog.',`<form id="modalForm" data-form="product"><input type="hidden" name="id" value="${p.id||''}"><div class="form-grid">${field('Product name','name',p.name||'','text',true,'e.g. Embroidered Lawn Suit')}${field('SKU / item code','sku',p.sku||generateSku(),'text',true)}${selectField('Category','category',categoryOptions,selectedCategory)}<div id="customCategoryGroup" style="display:${customCategoryVisible?'block':'none'};margin-top:10px">${field('Custom category name','customCategory','','text',true,'e.g. Formal wear')}</div>${field('Retail price (PKR)','price',p.price??'','number',true,'0')}${field('Cost price (PKR)','cost',p.cost??'','number',true,'0')}${field('Stock quantity','stock',p.stock??'','number',true,'0')}${field('Minimum stock alert','minStock',p.minStock??5,'number',true,'5')}${field('Color / variant','color',p.color||'','text',false,'e.g. Olive')}${edit?field('Size / fit','size',p.size||'','text',false,'S / M / L'):''}${`<div class="full-span"><label>Notes</label><textarea name="notes" placeholder="Optional product details"></textarea></div>`}</div></form>`,{formId:'modalForm',submit:edit?'Save changes':'Add product'});}
function customerForm(c={}){const edit=!!c.id;showModal(edit?'Edit customer':'Add customer',edit?'Update customer contact details.':'Add a customer to the directory.',`<form id="modalForm" data-form="customer"><input type="hidden" name="id" value="${c.id||''}"><div class="form-grid">${field('Full name','name',c.name||'','text',true,'Customer name')}${field('Phone number','phone',c.phone||'','tel',true,'03xx xxxxxxx')}${field('Email','email',c.email||'','email',false,'name@email.com')}</div></form>`,{submit:edit?'Save changes':'Add customer'});}
function khataPaymentForm(c){showModal('Record Khata payment',`Outstanding balance: ${money(c.balance)}`,`<form id="modalForm" data-form="khata-payment"><input type="hidden" name="customerId" value="${c.id}"><div class="form-grid">${field('Customer','customerName',c.name,'text',true)}${field('Payment received (PKR)','amount',c.balance,'number',true,'Amount received')}<div class="full-span">${field('Note','note','','text',false,'Cash received, bank transfer, etc.')}</div></div><p class="page-desc">This reduces the customer's outstanding Khata balance and adds a ledger entry.</p></form>`,{submit:'Record payment'});}
async function allocateUnallocatedForm(paymentId){
 const client=window.MA_SUPABASE,store=window.MA_STORE;if(!client||!store?.id){toast('Database connection is not ready.');return;}
 try{const {data:pay,error:perr}=await client.from('customer_payments').select('id,customer_id,amount,method,unallocated_amount,note,created_at').eq('store_id',store.id).eq('id',paymentId).maybeSingle();if(perr)throw perr;if(!pay){toast('Payment record not found.');return;}if(!pay.unallocated_amount||pay.unallocated_amount<=0){toast('This payment has no unallocated funds.');return;}const c=customers.find(x=>x.id===pay.customer_id);if(!c){toast('Customer record not found.');return;}const {data:sales,error:serr}=await client.from('sales').select('id,sale_number,total,customer_id,status').eq('store_id',store.id).eq('customer_id',pay.customer_id).eq('status','pending').order('sold_at',{ascending:true});if(serr)throw serr;if(!sales||sales.length===0){toast('No outstanding credit sales for this customer.');return;}const allocRows=await client.from('payment_allocations').select('sale_id,amount').eq('store_id',store.id).in('sale_id',sales.map(s=>s.id));if(allocRows.error)throw allocRows.error;const allocMap=new Map();(allocRows.data||[]).forEach(a=>allocMap.set(a.sale_id,(allocMap.get(a.sale_id)||0)+Number(a.amount||0)));const lines=sales.map(s=>{const allocatedAlready=allocMap.get(s.id)||0;const remaining=Math.max(0,Number(s.total)-allocatedAlready);return `<div style="margin-bottom:8px;padding:8px;border:1px solid var(--line);border-radius:8px;background:var(--surface)"><div style="display:flex;justify-content:space-between;align-items:center"><div><strong>Sale #${s.sale_number}</strong><span style="color:var(--muted);font-size:10px"> · Total: ${money(s.total)}</span></div><div style="text-align:right">${money(remaining)} remaining</div></div><div style="margin-top:6px"><label style="font-size:10px">Allocate (PKR)</label><input name="alloc_${s.id}" type="number" min="0" max="${remaining}" value="0" step="1" style="width:120px;padding:6px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--text);font-size:11px"></div></div>`;}).join('');showModal('Allocate Unallocated Funds',`Payment #${pay.id.substring(0,8)} · Unallocated: ${money(pay.unallocated_amount)}`,`<form id="modalForm" data-form="allocate-payment"><input type="hidden" name="paymentId" value="${pay.id}">${lines}<div style="margin-top:12px;font-size:10px;color:var(--muted)">Total unallocated: ${money(pay.unallocated_amount)}</div></form>`,{submit:'Allocate funds'});}catch(err){toast(err.message||'Allocation form failed.');}}
function supplierForm(s={}){const edit=!!s.id;showModal(edit?'Edit supplier':'Add supplier',edit?'Update vendor details.':'Keep your fabric and merchandise vendors organized.',`<form id="modalForm" data-form="supplier"><input type="hidden" name="id" value="${s.id||''}"><div class="form-grid">${field('Supplier name','name',s.name||'','text',true,'Business name')}${field('Contact person','contact',s.contact||'','text',true,'Contact name')}${field('Phone number','phone',s.phone||'','tel',true,'03xx xxxxxxx')}${field('Category','category',s.category||'','text',true,'e.g. Fabric & unstitched')}${edit?'':field('Opening balance (PKR)','balance',0,'number',true,'0')}</div></form>`,{submit:edit?'Save changes':'Add supplier'});}
function supplierForm(s={}){const edit=!!s.id;showModal(edit?'Edit supplier':'Add supplier',edit?'Update vendor details.':'Keep your fabric and merchandise vendors organized.',`<form id="modalForm" data-form="supplier"><input type="hidden" name="id" value="${s.id||''}"><div class="form-grid">${field('Supplier name','name',s.name||'','text',true,'Business name')}${field('Contact person','contact',s.contact||'','text',true,'Contact name')}${field('Phone number','phone',s.phone||'','tel',true,'03xx xxxxxxx')}${field('Category','category',s.category||'','text',true,'e.g. Fabric & unstitched')}${edit?'':field('Opening balance (PKR)','balance',0,'number',true,'0')}</div></form>`,{submit:edit?'Save changes':'Add supplier'});}
function supplierPaymentForm(s){showModal('Pay supplier',`${s.name} · Outstanding ${money(s.balance)}`,`<form id="modalForm" data-form="supplier-payment"><input type="hidden" name="supplierId" value="${s.id}"><div class="form-grid">${field('Payment amount (PKR)','amount',s.balance,'number',true,'Amount paid')}<div class="full-span">${field('Note','note','','text',false,'Cash, transfer reference, etc.')}</div></div></form>`,{submit:'Record payment'});}
function expenseForm(x={}){const edit=!!x.id;showModal(edit?'Edit expense':'Add expense',edit?'Update this cost entry.':'Record a cost for your shop.',`<form id="modalForm" data-form="expense"><input type="hidden" name="id" value="${x.id||''}"><div class="form-grid">${field('Expense title','title',x.title||'','text',true,'e.g. Packaging supplies')}${selectField('Category','category',['Rent','Utilities','Supplies','Transport','Salaries','Other'],x.category||'Supplies')}${field('Amount (PKR)','amount',x.amount??'','number',true,'0')}${field('Date','date',x.date||todayIso(),'date',true)}<div class="full-span">${field('Note','note',x.note||'','text',false,'Optional note')}</div></div></form>`,{submit:edit?'Save changes':'Add expense'});}
function employeeForm(x={}){const edit=!!x.id;const inviteFields=edit?'':`${field('Invitation email','email','','email',true,'name@example.com')}${selectField('Store role','inviteRole',['Manager','Cashier'],'Cashier')}`;const editFields=edit?`${field('Role title','role',x.role||'Sales assistant','text',true,'Sales assistant')}${selectField('Status','status',['Active','Inactive'],x.status||'Active')}`:'';showModal(edit?'Edit employee':'Invite employee',edit?'Update team member details.':'Send a secure store invitation. The employee will receive access after accepting the email invitation.',`<form id="modalForm" data-form="employee"><input type="hidden" name="id" value="${x.id||''}"><div class="form-grid">${field('Full name','name',x.name||'','text',true,'Team member name')}${inviteFields}${field('Phone number','phone',x.phone||'','tel',false,'03xx xxxxxxx')}${editFields}</div></form>`,{submit:edit?'Save changes':'Send invitation'});}
function categoryForm(name=''){const old=categories.find(c=>c.name===name);showModal(old?'Edit category':'Add category',old?'Update category name and description.':'Create a category for your catalog.',`<form id="modalForm" data-form="category"><input type="hidden" name="oldName" value="${e(old?.name||'')}"><div class="form-grid">${field('Category name','name',old?.name||'','text',true,'e.g. Formal wear')}<div class="full-span">${field('Description','description',old?.description||'','text',false,'What items belong here?')}</div></div></form>`,{submit:old?'Save changes':'Add category'});}
function poForm(){showModal('Create purchase order','Add multiple catalog items to this order.',`<form id="modalForm" data-form="po"><div class="form-grid">${selectField('Supplier','supplierId',suppliers.map(s=>s.name),suppliers[0]?.name||'')}${field('Order date','date',todayIso(),'date',true)}${selectField('Product','productId',products.map(p=>p.name),products[0]?.name||'')}${field('Quantity','quantity','1','number',true)}${field('Unit cost (PKR)','unitCost',products[0]?.cost||0,'number',true)}<div class="full-span"><button type="button" class="btn" data-action="po-add-line">Add line</button><div id="poLineList" class="settings-block" style="padding-top:10px"></div><input type="hidden" name="poLines" value=""></div></div></form>`,{submit:'Create order'});}function openReceipt(s){lastReceipt=s;showModal('Sale receipt',`Receipt #${s.id} · ${dateTime(s.date)}`,receiptMarkup(s),{wide:false,footer:true,submit:'Print receipt'});}
function receiptMarkup(s){const t=saleTotals(s);return `<div class="receipt"><div class="receipt-brand">${e(window.MA_STORE?.name || 'MA Collection')}</div><div class="receipt-sub">Clothing & garments · Lahore, Pakistan</div><div class="receipt-divider"></div><div class="receipt-line"><span>Invoice</span><strong>#${s.id}</strong></div><div class="receipt-line"><span>Date</span><span>${dateTime(s.date)}</span></div><div class="receipt-line"><span>Customer</span><span>${e(s.customer)}</span></div>${s.phone?'<div class="receipt-line"><span>Phone</span><span>+'+e(normalizePakPhone(s.phone))+'</span></div>':''}<div class="receipt-divider"></div>${s.items.map(i=>`<div class="receipt-line"><span>${e(i.name)} × ${i.qty}</span><span>${money(i.price*i.qty)}</span></div>`).join('')}<div class="receipt-divider"></div><div class="receipt-line"><span>Subtotal</span><span>${money(t.subtotal)}</span></div><div class="receipt-line"><span>Discount</span><span>${money(t.discount)}</span></div><div class="receipt-line"><span>Paid</span><span>${money(t.paid)}</span></div><div class="receipt-line"><span>Remaining</span><span>${money(t.remaining)}</span></div><div class="receipt-line total"><span>Total</span><strong>${money(t.total)}</strong></div><div class="receipt-line"><span>Payment method</span><span>${e(s.payment)}</span></div>${(s.paymentDetails||[]).map(p=>`<div class="receipt-line"><span>${e(p.method)}${p.reference?' · '+e(p.reference):''}</span><span>${money(Number(p.amount))}</span></div>`).join(')}${(s.ledgerEntries||[]).map(x=>`<div class="receipt-line"><span>Khata ${e(x.entry_type)}</span><span>${money(Math.abs(Number(x.amount_change)))}</span></div>`).join(')}<div class="receipt-divider"></div><div style="font-size:10px;color:var(--muted);line-height:1.5">Thank you for shopping with us!<br>We hope to see you again.</div></div>`;}
function doExport(type){let data=[], filename=`ma-collection-${type}-${todayIso()}.csv`;
 if(type==='products'||type==='inventory') {data=[['SKU','Name','Category','Retail Price','Cost Price','Stock','Minimum Stock'],...products.map(p=>[p.sku,p.name,p.category,p.price,p.cost,p.stock,p.minStock])];}
 else if(type==='sales'||type==='report'||type==='dashboard') {data=[['Receipt','Customer','Date','Items','Payment','Total','Status','Profit'],...sales.map(s=>[s.id,s.customer,s.date,s.items.reduce((a,x)=>a+x.qty,0),s.payment,s.total,s.status,s.profit])];}
 else if(type==='customers'){data=[['Name','Phone','Email','Balance','Orders'],...customers.map(c=>[c.name,c.phone,c.email,c.balance,c.orders])];}
 else if(type==='suppliers'){data=[['Supplier','Contact','Phone','Category','Balance'],...suppliers.map(s=>[s.name,s.contact,s.phone,s.category,s.balance])];}
 else if(type==='expenses'){data=[['Title','Category','Date','Amount','Note'],...expenses.map(x=>[x.title,x.category,x.date,x.amount,x.note])];}
 const csv=data.map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);toast(`${type[0].toUpperCase()+type.slice(1)} export prepared.`);}
function resetDemo(){location.reload();}
async function handleFormSubmit(form){
  if (!canSubmitForm(form)) { toast('You do not have permission to save this record.'); return; }
 const customSelects=Array.from(form.querySelectorAll('select[data-custom-select]')).filter(select=>select.value==='__custom_option__');if(customSelects.some(select=>!String(select.parentElement.querySelector('[data-custom-select-input]')?.value||'').trim())){toast('Type your own value before saving.');return;}customSelects.forEach(select=>{const input=select.parentElement.querySelector('[data-custom-select-input]'),value=String(input.value).trim();let option=Array.from(select.options).find(o=>o.value===value);if(!option){option=new Option(value,value);select.add(option);}select.value=value;});
 const fd=new FormData(form), d=Object.fromEntries(fd.entries()), rawId=String(d.id||''), id=rawId ? (Number.isFinite(Number(rawId))?Number(rawId):rawId) : 0;
 if(form.dataset.form==='product'){
   let category=d.category;
   if(category==='Custom/Other'){
     category=String(d.customCategory||'').trim();
     if(!category){toast('Enter a custom category name.');return;}
     if(!categories.some(c=>c.name===category))categories.push({name:category,description:'',count:0});
   }
   const p={id:id||null,name:d.name.trim(),sku:d.sku.trim(),category:category,price:Number(d.price),cost:Number(d.cost),stock:Number(d.stock),minStock:Number(d.minStock),color:(d.color||'').trim(),size:(d.size||'').trim()};
   if(!p.name||!p.sku||p.price<1||![p.price,p.cost,p.stock,p.minStock].every(v=>Number.isSafeInteger(v)&&v>=0)){toast('Enter a product name, SKU, valid price, cost and stock quantities.');return;}
   const duplicate=products.some(x=>String(x.sku).toLowerCase()===p.sku.toLowerCase()&&String(x.id)!==String(id));
   if(duplicate){toast('That SKU is already in use.');return;}
   if(!p.category||!p.category.trim()){toast('Select a product category.');return;}

   const client=window.MA_SUPABASE, store=window.MA_STORE;
   if(!client||!store||!store.id){toast('Supabase connection is not ready.');return;}
   if(!['owner','manager'].includes(store.role)){toast('Owner or manager access required to save products.');return;}

   try{
     const {data,error}=await client.rpc('save_product',{
       p_store_id:store.id,
       p_product_id:id||null,
       p_name:p.name,
       p_sku:p.sku,
       p_category:p.category,
       p_price:p.price,
       p_cost:p.cost,
       p_stock_quantity:p.stock,
       p_min_stock:p.minStock,
       p_color:p.color||null,
       p_size:p.size||null
     });
     if(error)throw error;
     const savedId=typeof data==='string'?data:(Array.isArray(data)?data[0]:(data&&(data.save_product||data.id)));
      if(!savedId)throw new Error('The database did not return a product ID.');
      if(window.MA_STORE?.id!==store.id)return;
      closeModal();
      toast(id?'Product updated and saved to database.':'Product saved to database.');
      await loadProductsFromDatabase();
   }catch(error){
     console.error('Product save failed:',error);
     const errorMessage=String(error?.message||''); if(error?.code==='23505'||/products_store_sku_uidx|duplicate key/i.test(errorMessage)){toast('This SKU already exists in this store. Choose a different SKU.');}else{toast('Product save failed: '+(errorMessage||'Check database permissions.'));}
   }
 } else if(form.dataset.form==='customer'){
  const client=window.MA_SUPABASE,store=window.MA_STORE;if(!client||!store?.id){toast('Database unavailable.');return;}
  const payload={name:d.name.trim(),phone:normalizePakPhone(d.phone),email:d.email.trim()||null};if(!payload.name||!/^923\d{9}$/.test(payload.phone)){toast('Enter a name and valid Pakistani mobile number.');return;}
  try{let q=id?client.from('customers').update(payload).eq('store_id',store.id).eq('id',id):client.from('customers').insert({...payload,store_id:store.id});const r=await q.select('id').maybeSingle();if(r.error)throw r.error;if(!r.data)throw new Error('Customer was not saved.');await loadCustomersFromDatabase();closeModal();renderPage();toast('Customer saved.');}catch(err){toast(err.message||'Customer save failed.');}
 } else if(form.dataset.form==='khata-payment'){
  const client=window.MA_SUPABASE,store=window.MA_STORE,c=findById(customers,d.customerId);let amount;try{amount=toSafeWholeNumber(d.amount,'Payment amount');}catch(error){toast(error.message);return;}if(!client||!store?.id||!c||amount<1||amount>c.balance){toast('Check payment amount and customer balance.');return;}const key=window.crypto?.randomUUID?.();if(!key){toast('Secure payment token unavailable.');return;}try{const {error}=await client.rpc('record_customer_payment_and_allocate',{p_store_id:store.id,p_customer_id:c.id,p_amount:amount,p_method:'cash',p_note:String(d.note||'').trim()||null,p_idempotency_key:key,p_allocations:'[]'});if(error)throw error;await loadCustomersFromDatabase();closeModal();renderPage();toast('Khata payment recorded.');}catch(err){toast(err.message||'Payment failed.');}
 } else if(form.dataset.form==='allocate-payment'){
  const client=window.MA_SUPABASE,store=window.MA_STORE;if(!client||!store?.id){toast('Database unavailable.');return;}const paymentId=d.paymentId;if(!paymentId){toast('No payment selected.');return;}const allocations=[];const formEl=form;const inputs=formEl.querySelectorAll('input[name^="alloc_"]');for(const inp of inputs){const saleId=inp.name.replace('alloc_','');const amt=Number(inp.value||0);if(amt<1){continue;}allocations.push({sale_id:saleId,amount:amt});}if(allocations.length===0){toast('Enter at least one allocation amount.');return;}const key=window.crypto?.randomUUID?.();if(!key){toast('Secure allocation token unavailable.');return;}try{const {error}=await client.rpc('allocate_unallocated_payment',{p_store_id:store.id,p_payment_id:paymentId,p_allocations:JSON.stringify(allocations),p_idempotency_key:key});if(error)throw error;await Promise.all([loadCustomersFromDatabase(),loadSalesFromDatabase()]);closeModal();renderPage();toast('Funds allocated.');}catch(err){toast(err.message||'Allocation failed.');}
 } else if(form.dataset.form==='supplier'){
  const client=window.MA_SUPABASE,store=window.MA_STORE;if(!client||!store?.id){toast('Database unavailable.');return;}const opening=Number(d.balance||0);if(!Number.isSafeInteger(opening)||opening<0){toast('Opening balance must be a non-negative whole PKR amount.');return;}const payload={name:d.name.trim(),contact_person:d.contact.trim()||null,phone:normalizePakPhone(d.phone),category:d.category.trim()||null};if(!payload.name||!/^923\d{9}$/.test(payload.phone)){toast('Enter supplier name and valid mobile number.');return;}
  try{if(id){const r=await client.from('suppliers').update(payload).eq('store_id',store.id).eq('id',id).select('id').maybeSingle();if(r.error)throw r.error;if(!r.data)throw new Error('Supplier not saved.');}else{const key=window.crypto?.randomUUID?.();if(!key)throw new Error('Secure supplier token unavailable.');const r=await client.rpc('create_supplier_with_opening_balance',{p_store_id:store.id,p_name:payload.name,p_contact_person:payload.contact_person,p_phone:payload.phone,p_category:payload.category,p_opening_balance:opening,p_idempotency_key:key});if(r.error)throw r.error;if(!r.data)throw new Error('Supplier not saved.');}await loadSuppliersFromDatabase();closeModal();renderPage();toast('Supplier saved.');}catch(err){toast(err.message||'Supplier save failed.');}
 } else if(form.dataset.form==='supplier-payment'){
  const client=window.MA_SUPABASE,store=window.MA_STORE,supplier=findById(suppliers,d.supplierId);let amount;try{amount=toSafeWholeNumber(d.amount,'Amount');}catch(err){toast(err.message);return;}if(!client||!store?.id||!supplier||amount<1||amount>supplier.balance){toast('Payment amount exceeds supplier payable.');return;}const key=window.crypto?.randomUUID?.();if(!key){toast('Secure payment token unavailable.');return;}try{const {error}=await client.rpc('record_supplier_payment',{p_store_id:store.id,p_supplier_id:supplier.id,p_amount:amount,p_method:'cash',p_note:d.note.trim()||null,p_idempotency_key:key});if(error)throw error;await loadSuppliersFromDatabase();closeModal();renderPage();toast('Supplier payment recorded.');}catch(err){toast(err.message||'Payment failed.');} } else if(form.dataset.form==='expense'){
  const client=window.MA_SUPABASE,store=window.MA_STORE;let amount;try{amount=toSafeWholeNumber(d.amount,'Amount');}catch(err){toast(err.message);return;}if(!client||!store?.id||amount<1){toast('Check expense details.');return;}try{const {error}=await client.rpc('save_expense',{p_store_id:store.id,p_expense_id:id||null,p_title:d.title.trim(),p_category:d.category,p_amount:amount,p_date:d.date,p_note:d.note.trim()||null});if(error)throw error;await loadExpensesFromDatabase();closeModal();renderPage();toast('Expense saved.');}catch(err){toast(err.message||'Expense save failed.');} } else if(form.dataset.form==='employee'){
  const client=window.MA_SUPABASE, store=window.MA_STORE;
  if(!client||!store||!store.id||store.role!=='owner'){
    toast('Only the shop owner can manage employees.');return;
  }
  const employeeId=String(d.id||'').trim();
  const name=String(d.name||'').trim();
  if(!employeeId){
    const invitation=window.MAEmployeeInvitations;
    const email=String(d.email||'').trim();
    const role=String(d.inviteRole||'').trim().toLowerCase();
    if(!invitation){toast('Employee invitation module is unavailable. Reload the application.');return;}
    if(form.dataset.invitePending==='true')return;
    if(!name||name.length>120||email.length>254||!['manager','cashier'].includes(role)){
      toast('Enter an employee name, valid email and Manager or Cashier role.');return;
    }
    form.dataset.invitePending='true';
    const inviteButton=document.querySelector(`[data-submit-form="${form.id}"]`);
    if(inviteButton)inviteButton.disabled=true;
    try{
      const result=await invitation.inviteEmployee(client,{store_id:store.id,email,full_name:name,phone:d.phone,role});
      if(window.MA_STORE?.id!==store.id)return;
      await loadEmployeesFromDatabase();
      if(window.MA_STORE?.id!==store.id)return;
      closeModal();renderPage();
      toast(result.message||'Invitation sent and employee added.');
    }catch(error){
      if(window.MA_STORE?.id===store.id)toast(invitation.errorMessage(error));
    }finally{
      delete form.dataset.invitePending;
      if(inviteButton?.isConnected)inviteButton.disabled=false;
    }
    return;
  }
  const roleTitle=String(d.role||'').trim();
  const phone=String(d.phone||'').trim();
  const status=String(d.status||'Active');
  if(!name||name.length>120||!roleTitle||roleTitle.length>80||
     phone.length>30||!['Active','Inactive'].includes(status)){
    toast('Check the employee details and try again.');return;
  }
  try{
    const payload={name:name,role_title:roleTitle,phone:phone||null,status:status.toLowerCase()};
    let result;
    if(employeeId){
      result=await client.from('employees').update(payload)
        .eq('id',employeeId).eq('store_id',store.id)
        .select('id,name,role_title,phone,status,user_id').maybeSingle();
    }else{
      result=await client.from('employees').insert({...payload,store_id:store.id})
        .select('id,name,role_title,phone,status').single();
    }
    if(result.error)throw result.error;
    if(!result.data)throw new Error('No employee row returned; check Owner access.');
    const r=result.data;
    const saved={id:r.id,userId:r.user_id||null,name:r.name,role:r.role_title,phone:r.phone||'',
      status:r.status==='inactive'?'Inactive':'Active'};
    const index=employees.findIndex(function(a){return String(a.id)===String(saved.id);});
    if(index>=0)employees[index]=saved;else employees.unshift(saved);
    closeModal();renderPage();
    toast(employeeId?'Employee updated in database.':'Employee saved to database.');
  }catch(error){
    console.error('Employee save failed:',error);
    toast('Could not save employee. Check connection and Owner permissions.');
  }
  } else if(form.dataset.form==='category'){
   const client=window.MA_SUPABASE,store=window.MA_STORE;const name=d.name.trim();if(!client||!store?.id||!name||name.length>80){toast('Check category name.');return;}
   try{let result;if(d.oldName){const old=categories.find(x=>x.name===d.oldName);if(!old?.id)throw new Error('Category ID missing.');result=await client.from('categories').update({name,description:d.description.trim()||null}).eq('store_id',store.id).eq('id',old.id).select('id').maybeSingle();}else result=await client.from('categories').insert({store_id:store.id,name,description:d.description.trim()||null}).select('id').single();if(result.error)throw result.error;await loadProductsFromDatabase();closeModal();renderPage();toast('Category saved.');}catch(err){toast(err.message||'Category save failed.');} } else if(form.dataset.form==='supplier-adjust'){
  const c=window.MA_SUPABASE,s=window.MA_STORE,supplier=findById(suppliers,d.supplierId),amount=Number(d.amount),key=window.crypto?.randomUUID?.();if(!c||!s?.id||s.role!=='owner'||!supplier||!Number.isSafeInteger(amount)||amount===0||!key){toast('Check owner access and adjustment details.');return;}try{const {error}=await c.rpc('adjust_supplier_balance',{p_store_id:s.id,p_supplier_id:supplier.id,p_amount_change:amount,p_note:d.note.trim(),p_idempotency_key:key});if(error)throw error;await loadSuppliersFromDatabase();closeModal();renderPage();toast('Supplier balance adjusted.');}catch(err){toast(err.message||'Adjustment failed.');}
 } else if(form.dataset.form==='po-cancel'){
  const c=window.MA_SUPABASE,s=window.MA_STORE,id=d.id;if(!c||!s?.id||!d.reason.trim()){toast('A cancellation reason is required.');return;}try{const {error}=await c.rpc('cancel_purchase_order',{p_store_id:s.id,p_purchase_order_id:id,p_reason:d.reason.trim()});if(error)throw error;await loadPurchaseOrdersFromDatabase();closeModal();renderPage();toast('Purchase order cancelled.');}catch(err){toast(err.message||'Cancellation failed.');} } else if(form.dataset.form==='po'){
  const client=window.MA_SUPABASE,store=window.MA_STORE,supplier=suppliers.find(x=>x.name===d.supplierId),lines=JSON.parse(d.poLines||'[]');if(!client||!store?.id||!supplier||!lines.length){toast('Select a supplier and add at least one valid PO line.');return;}const key=window.crypto?.randomUUID?.();if(!key){toast('Secure order token unavailable.');return;}try{const {error}=await client.rpc('create_purchase_order',{p_store_id:store.id,p_supplier_id:supplier.id,p_order_date:d.date,p_note:null,p_items:lines,p_idempotency_key:key});if(error)throw error;await loadPurchaseOrdersFromDatabase();closeModal();renderPage();toast('Purchase order created.');}catch(err){toast(err.message||'Could not create purchase order.');} } else if(form.id==='storeSettingsForm'){
   const client=window.MA_SUPABASE;
   const store=window.MA_STORE;
   if(!client || !store || !store.id || store.role!=='owner'){
     toast('Only the shop owner can save store details.');
     return;
   }

   const name=String(d.storeName||'').trim();
   const businessType=String(d.businessType||'');
   const phone=String(d.phone||'').trim();
   const address=String(d.address||'').trim();

   if(!name || name.length>120 ||
      !['Clothing & garments','Retail boutique','Accessories'].includes(businessType) ||
      phone.length>30 || address.length>300){
     toast('Please check the store details and try again.');
     return;
   }

   try{
     const {data,error}=await client.from('stores')
       .update({
         name,
         business_type:businessType,
         phone:phone||null,
         address:address||null
       })
       .eq('id',store.id)
       .select('id,name,business_type,phone,address')
       .maybeSingle();

     if(error) throw error;
     if(!data){
       toast('Store profile was not updated. Check owner access and database permissions.');
       return;
     }

     Object.assign(store,{
       name:data.name,
       business_type:data.business_type,
       phone:data.phone||'',
       address:data.address||''
     });

     const label=document.querySelector('.store-meta strong');
     if(label) label.textContent=data.name;

     renderPage();
     toast('Store profile saved successfully.');
   }catch(error){
     console.error('Store profile save failed:',error);
     toast('Could not save store profile. Check connection and permissions.');
   }
 }
}
function handleAction(action,target){if(!canPerformAction(action,target)){toast('You do not have permission to perform this action.');return;}const id=target.dataset.id, name=target.dataset.name;
 switch(action){
 case 'toggle-menu':toggleMenu();break;case 'close-menu':if(target.id==='mobileOverlay'||target===target.closest('[data-action="close-menu"]'))closeMenu();break;
 case 'close-modal':closeModal();break;case 'backdrop-close':if(target.classList.contains('modal-backdrop'))closeModal();break;
 case 'modal-submit':{const f=$('#'+target.dataset.submitForm);if(f){if(typeof f.reportValidity==='function'&&!f.reportValidity())break;try{handleFormSubmit(f);}catch(error){console.error('Modal form submission failed:',error);toast('Could not save this record. Check the fields and try again.');}}else if(lastReceipt){window.print();}break;}
 case 'store-switch':currentPage='settings';currentSettingsTab='Store profile';renderPage();break;
 case 'help':showModal('Help center','A quick guide to your store workspace',`<div class="settings-block" style="padding:0 0 14px"><h3>Managing products</h3><p>Use Products to add items and set their prices and stock. Inventory lets you adjust quantities.</p></div><div class="settings-block" style="padding:14px 0"><h3>Billing a sale</h3><p>Open New sale, choose items, select the payment method, and complete checkout.</p></div><div class="settings-block" style="padding:14px 0 0"><h3>Reports</h3><p>Review sales, stock and payment summaries under Reports & analytics.</p></div>`,{footer:false});break;
 case 'notifications':{const low=products.filter(p=>p.stock===0||(p.minStock>0&&p.stock<=p.minStock));const due=customers.reduce((s,c)=>s+c.balance,0);const latest=sales[0];showModal('Notifications','Current store activity',`${low.length?low.map(p=>`<div class="sale-row"><div class="sale-product-icon">${ic('info')}</div><div class="sale-meta"><strong>${p.stock===0?'Out of stock':'Low stock'}: ${e(p.name)}</strong><span>${p.stock} units available (minimum ${p.minStock}).</span></div><span class="badge warn">Stock</span></div>`).join(''):'<div class="empty">No low-stock alerts.</div>'}<div class="sale-row"><div class="sale-product-icon">${ic('wallet')}</div><div class="sale-meta"><strong>Customer Khata outstanding</strong><span>${money(due)} due across your customers.</span></div></div>${latest?`<div class="sale-row"><div class="sale-product-icon">${ic('receipt')}</div><div class="sale-meta"><strong>Latest sale</strong><span>Receipt #${latest.id} · ${money(latest.total)}</span></div></div>`:'<div class="empty">No sales recorded yet.</div>'}`,{footer:false});break;}
 case 'toggle-theme':themeDark=!themeDark;document.documentElement.style.colorScheme=themeDark?'dark':'light';renderPage();toast(themeDark?'Dark appearance enabled.':'Light appearance enabled.');break;
 case 'settings-tab':currentSettingsTab=target.dataset.tab;renderPage();break;
 case 'toggle-setting':{const label=target.parentElement?.querySelector('strong')?.textContent||'',map={'Show SKU on product list':'show_sku','Warn when stock is low':'warn_low_stock','Ask for customer on each sale':'ask_customer_each_sale','Allow discounts':'allow_discounts','Show receipt after checkout':'show_receipt_after_checkout','Compact tables':'compact_tables'};const col=map[label];if(!col){toast('This appearance option is local to this browser.');break;}void saveStoreSettings({[col]:!storeSettings[col]});break;}
 case 'save-inventory-settings':{const min=Number($('#defaultMinStock')?.value),unit=$('#stockUnit')?.value||'Pieces';if(!Number.isSafeInteger(min)||min<0){toast('Default minimum stock must be a non-negative whole number.');break;}void saveStoreSettings({default_min_stock:min,stock_unit:unit});break;} case 'reset-demo':if(confirm('Reset sample data and reload the demo?'))resetDemo();break;
 case 'add-product':productForm();break;case 'edit-product':{const p=products.find(x=>String(x.id)===String(target.dataset.id));if(p)productForm(p);break;}
 case 'delete-product':{const p=products.find(x=>String(x.id)===String(target.dataset.id));if(p)void archiveProductFromDatabase(p);break;} case 'product-category':productFilter=target.dataset.category;renderPage();break;
 case 'pos-category':categoryFilter=target.dataset.category;renderPage();break;
 case 'add-cart':{const p=findById(products,id);if(!p||p.stock<=0){toast('This item is out of stock.');break;}const it=cart.find(x=>x.id===p.id);if(it){if(it.qty>=p.stock){toast('No more stock available for this item.');break;}it.qty++;}else cart.push({id:p.id,name:p.name,price:p.price,qty:1});renderPage();toast('Added to current bill.');break;}
 case 'cart-qty':{const it=cart.find(x=>x.id===id);if(!it)break;const delta=Number(target.dataset.delta);const p=findById(products,id);if(delta>0&&p&&it.qty>=p.stock){toast('No more stock available.');break;}it.qty+=delta;if(it.qty<=0)cart=cart.filter(x=>x.id!==id);renderPage();break;}
 case 'clear-cart':if(cart.length&&confirm('Clear all items from this bill?')){cart=[];renderPage();toast('Current bill cleared.');}else if(!cart.length)toast('Your bill is already empty.');break;
 case 'checkout':checkout();break;
 case 'share-bill':{const s=lastReceipt||(id?findById(sales,id):null);if(!s){toast('No sale to share. Complete a sale first.');break;}shareBillFile(s);break;}
case 'download-receipt-pdf':{const s=saleForShare(id);if(s)downloadReceiptPdf(s);break;}
case 'share-whatsapp':{const s=saleForShare(id);if(s){const p=normalizePakPhone(s.phone);if(p.length>=11){window.open('https://wa.me/'+p,'_blank','noopener,noreferrer');toast('WhatsApp chat opened. Attach the PDF and press Send.');}else toast('No customer phone for WhatsApp.');}break;}
 case 'clear-local-data':if(confirm('Delete all records saved in this browser? This cannot be undone.')){[products,customers,suppliers,employees,sales,expenses,purchaseOrders,khataLedger].forEach(list=>list.splice(0,list.length));categories.splice(0,categories.length,{name:'Unstitched',count:0,description:'Lawn, khaddar, formal suits'},{name:'Ready to wear',count:0,description:'Kurtis, co-ords, trousers'},{name:'Accessories',count:0,description:'Dupattas, clutches, jewellery'},{name:'Seasonal',count:0,description:'Limited-time collections'});cart=[];lastReceipt=null;localStorage.removeItem('maCollectionState');renderPage();toast('Local records cleared.');}break;
 case 'edit-cart-price':{const item=cart.find(x=>x.id===id);if(!item){toast('Cart item not found.');break;}editingCartPriceId=item.id;renderPage();break;}
 case 'save-cart-price':{const item=cart.find(x=>x.id===id),input=$('[data-cart-price-input="'+id+'"]');if(!item||!input){toast('Could not find this bill item.');break;}try{const price=toSafeWholeNumber(input.value,'Sale price');if(price===0)throw new Error('Sale price must be greater than zero.');item.price=price;editingCartPriceId=null;renderPage();toast('Sale price updated. Catalog price is unchanged.');}catch(error){toast(error.message);}break;}
 case 'cancel-cart-price':editingCartPriceId=null;renderPage();break;
 case 'sales-filter':salesFilter=target.dataset.filter;renderPage();break;
 case 'view-sale':{const s=findById(sales,id);if(s)void openSaleDetails(s);break;}
 case 'print-sale':{const s=findById(sales,id);if(s)void openSaleDetails(s);break;}
 case 'add-customer':customerForm();break;case 'edit-customer':{const c=findById(customers,id);if(c)customerForm(c);break;}
 case 'view-customer':{const c=findById(customers,id);if(c){const entries=khataLedger.filter(x=>x.customerId===c.id).sort((a,b)=>new Date(b.date)-new Date(a.date));showModal(c.name,'Customer account and Khata ledger',`<div class="two-col"><div class="stat-card"><div class="stat-top">Orders</div><div class="stat-value">${c.orders}</div></div><div class="stat-card"><div class="stat-top">Outstanding Khata</div><div class="stat-value">${money(c.balance)}</div></div></div><div class="settings-block" style="padding:17px 0 0"><div class="report-list-row"><span>Phone</span><strong>${e(c.phone)}</strong></div><div class="report-list-row" style="margin-top:12px"><span>Email</span><strong>${e(c.email||'—')}</strong></div><div class="report-list-row" style="margin-top:12px"><span>Customer since</span><strong>${dateShort(c.joined)}</strong></div></div><div class="settings-block" style="padding:17px 0 0"><h3>Khata ledger</h3><p>Credit sales and payments received for this customer.</p>${entries.length?entries.map(x=>`<div class="sale-row"><div class="sale-meta"><strong>${e(x.type==='charge'?'Credit sale':'Payment received')}</strong><span>${dateTime(x.date)}${x.note?' · '+e(x.note):''}</span></div><div class="sale-amount" style="color:${x.type==='charge'?'var(--red)':'var(--olive)'}">${x.type==='charge'?'+':'−'}${money(x.amount)}</div>${x.type==='payment'&&x.paymentId?`<button class="mini-icon" data-action="allocate-unallocated" data-payment-id="${x.paymentId}" aria-label="Allocate unallocated funds">${ic('download')}</button>`:''}</div>`).join(''):'<div class="empty">No Khata transactions recorded yet.</div>'}</div>${c.balance>0?`<button class="btn primary full" data-action="record-khata-payment" data-id="${c.id}">Record payment received</button>`:''}`,{footer:false});}break;}
 case 'record-khata-payment':{const c=findById(customers,id);if(c&&c.balance>0)khataPaymentForm(c);else toast('This customer has no outstanding balance.');break;}
case 'allocate-unallocated':{const pid=target.dataset.paymentId;if(!pid){toast('No payment selected for allocation.');break;}allocateUnallocatedForm(pid);break;}
 case 'delete-customer':{const c=findById(customers,id);if(!c||!confirm(`Delete customer ${c.name}?`))break;const client=window.MA_SUPABASE,store=window.MA_STORE;client.from('customers').delete().eq('store_id',store.id).eq('id',c.id).select('id').maybeSingle().then(async r=>{if(r.error)throw r.error;if(!r.data)throw new Error('Customer could not be deleted.');await loadCustomersFromDatabase();renderPage();toast('Customer removed.');}).catch(err=>toast(err.message||'Customer delete failed.'));break;} case 'record-supplier-payment':{const supplier=findById(suppliers,id);if(supplier&&supplier.balance>0)supplierPaymentForm(supplier);break;} case 'adjust-supplier':{const supplier=findById(suppliers,id);if(supplier)showModal('Adjust supplier balance',supplier.name,`<form id="modalForm" data-form="supplier-adjust"><input type="hidden" name="supplierId" value="${supplier.id}">${field('Change amount (PKR, + adds payable; − reduces)','amount','0','number',true)}${field('Note','note','','text',true,'Opening balance or correction')}</form>`,{submit:'Save adjustment'});break;} case 'add-supplier':supplierForm();break;case 'edit-supplier':{const s=findById(suppliers,id);if(s)supplierForm(s);break;}
 case 'delete-supplier':{const x=findById(suppliers,id);if(!x||!confirm(`Delete supplier ${x.name}?`))break;window.MA_SUPABASE.from('suppliers').delete().eq('store_id',window.MA_STORE.id).eq('id',x.id).select('id').maybeSingle().then(async r=>{if(r.error)throw r.error;if(!r.data)throw new Error('Supplier could not be deleted.');await loadSuppliersFromDatabase();renderPage();toast('Supplier removed.');}).catch(err=>toast(err.message||'Supplier delete failed.'));break;} case 'add-expense':expenseForm();break;case 'edit-expense':{const x=findById(expenses,id);if(x)expenseForm(x);break;}
 case 'delete-expense':{const x=findById(expenses,id);if(!x||!confirm(`Delete expense ${x.title}?`))break;const c=window.MA_SUPABASE,s=window.MA_STORE;if(!c||!s?.id){toast('Database unavailable.');break;}c.from('expenses').delete().eq('store_id',s.id).eq('id',x.id).select('id').maybeSingle().then(async r=>{if(r.error)throw r.error;if(!r.data)throw new Error('Expense could not be deleted.');await loadExpensesFromDatabase();renderPage();toast('Expense removed.');}).catch(err=>toast(err.message||'Expense delete failed.'));break;}
 case 'add-employee':employeeForm();break;case 'edit-employee':{const x=employees.find(function(a){return String(a.id)===String(id);});if(x)employeeForm(x);break;}
 case 'delete-employee':{deleteEmployeeFromDatabase(id);break;}
  case 'add-category':categoryForm();break;case 'edit-category':categoryForm(name);break;
 case 'delete-category':{const category=categories.find(c=>c.name===name);if(!category?.id)break;if(products.some(p=>p.category===name)){toast('Move or edit products in this category before deleting it.');break;}if(!confirm(`Delete category ${name}?`))break;const c=window.MA_SUPABASE,s=window.MA_STORE;if(!c||!s?.id){toast('Database unavailable.');break;}c.from('categories').delete().eq('store_id',s.id).eq('id',category.id).select('id').maybeSingle().then(async r=>{if(r.error)throw r.error;if(!r.data)throw new Error('Category could not be deleted.');await loadProductsFromDatabase();renderPage();toast('Category deleted.');}).catch(err=>toast(err.message||'Category delete failed.'));break;}
 case 'po-add-line':{const form=$('#modalForm'),productName=form?.elements.productId.value,product=products.find(x=>x.name===productName),qty=Number(form?.elements.quantity.value),cost=Number(form?.elements.unitCost.value);if(!product||!Number.isSafeInteger(qty)||qty<1||!Number.isSafeInteger(cost)||cost<=0){toast('Enter a valid product, quantity and unit cost.');break;}const hidden=form.elements.poLines,lines=JSON.parse(hidden.value||'[]');lines.push({product_id:product.id,description:product.name,quantity:qty,unit_cost:cost});hidden.value=JSON.stringify(lines);$('#poLineList').innerHTML=lines.map((x,i)=>`<div class="report-list-row"><span>${i+1}. ${e(x.description)} × ${x.quantity}</span><strong>${money(x.quantity*x.unit_cost)}</strong></div>`).join('');break;}
 case 'cancel-po':{const po=findById(purchaseOrders,id);if(po){showModal('Cancel purchase order',`PO-${po.number||po.id}`,`<form id="modalForm" data-form="po-cancel"><input type="hidden" name="id" value="${po.id}">${field('Reason','reason','','text',true,'Cancellation reason')}</form>`,{submit:'Cancel order'});}break;}
 case 'add-po':poForm();break;case 'receive-po':{const p=findById(purchaseOrders,id);if(!p)break;void receivePurchaseOrder(p);break;}
 case 'delete-po':toast('Purchase orders cannot be deleted. Use Cancel for an unreceived pending order.');break;
 case 'adjust-stock':adjustStockForm(id);break;case 'stock-adjustment':adjustStockForm(null);break;
 case 'export-products':doExport('products');break;case 'export-inventory':doExport('inventory');break;case 'export-sales':doExport('sales');break;case 'export-customers':doExport('customers');break;case 'export-suppliers':doExport('suppliers');break;case 'export-expenses':doExport('expenses');break;case 'export-report':doExport('report');break;case 'export-dashboard':doExport('dashboard');break;
 }
}
function adjustStockForm(id){const p=id?findById(products,id):products[0];showModal(id?'Adjust stock':'Stock adjustment',id?'Update inventory for one product.':'Record a quantity correction or received stock.',`<form id="modalForm" data-form="stock"><div class="form-grid">${selectField('Product','productId',products.map(p=>p.name),p?.name||products[0]?.name)}${selectField('Adjustment type','type',['Add stock','Remove stock','Set exact quantity'],'Add stock')}${field('Quantity','quantity','1','number',true,'0')}<div class="full-span"><label>Reason</label><input name="reason" placeholder="e.g. New stock received"></div></div></form>`,{submit:'Update stock'});}
async function checkout(options){
 if(checkoutBusy){return;}
 if(!cart.length){toast('Add at least one product to the bill.');return;}
 const client=window.MA_SUPABASE,store=window.MA_STORE;
 if(!client||!store?.id){toast('Database connection is not ready.');return;}
 const selected=$('#customerSelect')?.value||'Walk-in customer';
 const customer=customers.find(c=>c.name===selected);
 const payment=($('#paymentSelect')?.value||'Cash').toLowerCase();
 const method=payment==='credit'?'credit':payment;
 const phone=normalizePakPhone($('#customerPhone')?.value||'');
 const name=selected==='__custom__'?String($('#customCustomerName')?.value||'').trim():(customer?.name||'Walk-in customer');
 if(selected==='__custom__'&&!name){toast('Enter a customer name.');return;}
 if(method==='credit'&&!customer){toast('Select a registered customer for a Khata sale.');return;}
 let totals;try{totals=calculateCartTotals(cart,storeSettings.allow_discounts?($('#discountInput')?.value||0):0,true);}catch(error){toast(error.message);return;}
 const key=window.crypto?.randomUUID?.();if(!key){toast('Secure checkout token unavailable in this browser.');return;}
 const btn=$('[data-action="checkout"]');
 if(btn){btn.disabled=true;btn.textContent='Processing…';}
 checkoutBusy=true;
 try{
  const {data,error}=await client.rpc('create_sale',{p_store_id:store.id,p_items:cart.map(i=>({product_id:String(i.id),quantity:Number(i.qty),unit_price:Number(i.price)})),p_payment_method:method,p_idempotency_key:key,p_discount:totals.discount,p_customer_id:customer?.id||null,p_customer_name:name,p_customer_phone:phone||null});
  if(error){toast(error.message||'Checkout failed. No sale was completed.');return;}if(window.MA_STORE?.id!==store.id)return;
  const result=Array.isArray(data)?data[0]:data;if(!result?.sale_id){toast('Checkout response was incomplete. Refresh sales before retrying.');return;}if(window.MA_STORE?.id!==store.id)return;
  cart=[];lastReceipt={id:result.sale_number,dbId:result.sale_id,customer:name,date:new Date().toISOString(),items:[],total:Number(result.total),payment:payment[0].toUpperCase()+payment.slice(1),status:method==='credit'?'Pending':'Completed',phone,subtotal:totals.subtotal,discount:totals.discount};
  await Promise.all([loadProductsFromDatabase(),loadCustomersFromDatabase(),loadSalesFromDatabase()]);
  closeModal();
  if(options?.share){shareBillFile(lastReceipt);}
  else{
    if(storeSettings.show_receipt_after_checkout) openReceipt(lastReceipt);
    if(lastReceipt.phone){showModal('Share invoice','Customer phone: '+e('+'+normalizePakPhone(lastReceipt.phone)),`<p>Share this invoice with the customer?</p><button class="btn primary" data-action="share-bill" style="margin-right:8px">Send via WhatsApp</button><button class="btn" data-action="close-modal">Not now</button>`,{footer:false});}
    toast('Sale completed and saved.');
  }
 }finally{
  checkoutBusy=false;
  const b2=$('[data-action="checkout"]');
  if(b2){b2.disabled=false;b2.textContent='Complete Sale';}
 }
}function formSubmitDelegation(ev){const form=ev.target.closest('form');if(!form)return;ev.preventDefault();if(form.dataset.form==='stock'){const d=Object.fromEntries(new FormData(form).entries()),p=products.find(p=>p.name===d.productId);let q;try{q=toSafeWholeNumber(d.quantity,'Stock quantity');}catch(error){toast(error.message);return;}if(!p){toast('Select a valid product.');return;}if(d.type!=='Set exact quantity'&&!q){toast('Quantity must be positive.');return;}const client=window.MA_SUPABASE,store=window.MA_STORE;if(!client||!store?.id){toast('Database unavailable.');return;}const rpc=d.type==='Set exact quantity'?'set_stock_quantity':'adjust_stock',args=rpc==='set_stock_quantity'?{p_store_id:store.id,p_product_id:p.id,p_quantity:q,p_reason:d.reason||'Inventory correction'}:{p_store_id:store.id,p_product_id:p.id,p_quantity_change:d.type==='Add stock'?q:-q,p_reason:d.reason||'Inventory adjustment'};client.rpc(rpc,args).then(async({error})=>{if(error)throw error;await loadProductsFromDatabase();closeModal();toast('Stock updated.');}).catch(error=>toast(error.message||'Stock update failed.'));return;}handleFormSubmit(form);}function applySearch(input){const key=input.dataset.localSearch;const query=input.value.trim().toLowerCase();$$(`[data-search-row="${key}"]`).forEach(row=>{row.hidden=!row.dataset.searchText.includes(query);});}
document.addEventListener('click',ev=>{
 const nav=ev.target.closest('[data-nav]');if(nav){navigate(nav.dataset.nav);return;}
 const target=ev.target.closest('[data-action]');if(target){if(target.dataset.action==='backdrop-close'&&ev.target!==target)return;if(target.dataset.action==='close-menu'&&target.id!=='mobileOverlay')return;handleAction(target.dataset.action,target);return;}
});
document.addEventListener('submit',formSubmitDelegation);
document.addEventListener('input',ev=>{if(ev.target.matches('[data-local-search]'))applySearch(ev.target);});
document.addEventListener('change',ev=>{if(ev.target.id==='productCategoryFilter'){productFilter=ev.target.value;renderPage();}if(ev.target.id==='dashboardPeriod'){dashboardPeriod=ev.target.value;renderPage();}if(ev.target.id==='reportPeriod'){reportPeriod=ev.target.value;renderPage();}if(ev.target.id==='discountInput'){const oldPage=currentPage;if(oldPage==='billing'){const val=ev.target.value;renderPage();const inp=$('#discountInput');if(inp)inp.value=val;}}if(ev.target.name==='category'&&ev.target.closest('[data-form="product"]')){const g=$('#customCategoryGroup');if(g)g.style.display=ev.target.value==='Custom/Other'?'block':'none';}});
document.addEventListener('keydown',ev=>{if((ev.metaKey||ev.ctrlKey)&&ev.key.toLowerCase()==='k'){ev.preventDefault();const g=$('#globalSearch');g.focus();}if(ev.key==='Enter'&&ev.target.id==='globalSearch'){const q=ev.target.value.trim().toLowerCase();if(q){const p=products.find(p=>(p.name+' '+p.sku+' '+p.category).toLowerCase().includes(q));const c=customers.find(c=>(c.name+' '+c.phone).toLowerCase().includes(q));if(p){navigate('products');const i=$('[data-local-search="products"]');if(i){i.value=q;applySearch(i);}}else if(c){navigate('customers');const i=$('[data-local-search="customers"]');if(i){i.value=q;applySearch(i);}}else{navigate('sales');const i=$('[data-local-search="sales"]');if(i){i.value=q;applySearch(i);}}}}if(ev.key==='Escape'){closeModal();closeMenu();}});
/* Clean first-run state; retain records entered in this browser on later visits. */
const __savedState = (()=>{try{return JSON.parse(localStorage.getItem('maCollectionState')||'null')}catch{return null}})();
function __restoreList(list,key){const saved=__savedState&&__savedState[key];list.splice(0,list.length,...(Array.isArray(saved)?saved:[]));}
__restoreList(products,'products');__restoreList(customers,'customers');__restoreList(suppliers,'suppliers');__restoreList(employees,'employees');__restoreList(sales,'sales');__restoreList(expenses,'expenses');__restoreList(purchaseOrders,'purchaseOrders');__restoreList(khataLedger,'khataLedger');
if(__savedState&&Array.isArray(__savedState.categories))categories.splice(0,categories.length,...__savedState.categories);
categories.forEach(c=>c.count=products.filter(p=>p.category===c.name).length);
function persistState(){try{localStorage.setItem('maCollectionState',JSON.stringify({products,customers,suppliers,employees,sales,expenses,purchaseOrders,categories,khataLedger}))}catch(error){console.warn('Local save unavailable in this browser.',error)}}

function setupCustomSelects(root){
 root.querySelectorAll('form select').forEach(select=>{
  const form=select.closest('form');
  if(form?.dataset.form==='stock'||['customerSelect','paymentSelect'].includes(select.id))return;
  select.dataset.customSelect='true';
  if(!Array.from(select.options).some(option=>option.value==='__custom_option__'))select.add(new Option('Type your own…','__custom_option__'));
  let input=select.parentElement.querySelector('[data-custom-select-input]');
  if(!input){input=document.createElement('input');input.type='text';input.dataset.customSelectInput='true';input.className='custom-select-input';input.placeholder='Type your own value';input.setAttribute('aria-label','Custom value');input.style.cssText='display:none;margin-top:7px;width:100%;border:1px solid var(--line);border-radius:9px;padding:10px;background:var(--surface);color:var(--text);font-size:11px';select.after(input);}
  input.style.display=select.value==='__custom_option__'?'block':'none';
 });
}

/* Use actual saved records for the dashboard and remove all seeded sample records. */
const __originalRenderPage = renderPage;
renderPage = function(){
  __originalRenderPage();
  persistState();
  const root=$('#pageContent');
  setupCustomSelects(root);
  if(currentPage==='dashboard'){
    const todaySales=sales.filter(s=>String(s.date).slice(0,10)===todayIso());
    const values=$$('.stats-grid .stat-card .stat-value',root);
    const now=new Date(),periodStart=new Date(now);
    if(dashboardPeriod==='Last 7 days')periodStart.setDate(now.getDate()-6);else if(dashboardPeriod==='This year')periodStart.setMonth(0,1);else periodStart.setDate(1);
    const periodSales=sales.filter(s=>new Date(s.date)>=periodStart&&new Date(s.date)<=now);
    const periodRevenue=periodSales.reduce((sum,s)=>sum+s.total,0);
    if(values[0])values[0].textContent=money(todaySales.reduce((sum,s)=>sum+s.total,0));
    if(values[1])values[1].textContent=money(todaySales.reduce((sum,s)=>sum+s.profit,0));
    if(values[2])values[2].textContent=products.reduce((sum,p)=>sum+p.stock,0).toLocaleString();
    if(values[3])values[3].textContent=money(customers.reduce((sum,c)=>sum+c.balance,0));
    const chart=$('.bar-chart',root),bucketSpan=Math.max(1,(now-periodStart)/14);
    const buckets=Array.from({length:14},(_,i)=>{const from=new Date(periodStart.getTime()+bucketSpan*i),to=new Date(periodStart.getTime()+bucketSpan*(i+1));return {date:from,total:periodSales.filter(s=>new Date(s.date)>=from&&new Date(s.date)<to).reduce((sum,s)=>sum+s.total,0)}});
    const max=Math.max(1,...buckets.map(d=>d.total));
    if(chart)chart.innerHTML=buckets.map((d,i)=>'<div class="bar-col"><div class="bar '+(i===13?'emph':'')+'" style="height:'+(d.total?Math.max(2,Math.round(d.total/max*88)):0)+'%"></div></div>').join('');
    const labels=$('.dashboard-main .chart-labels',root);
    if(labels)labels.innerHTML=buckets.map(d=>'<span>'+String(d.date.getDate()).padStart(2,'0')+'</span>').join('');
    const total=$('.dashboard-main .chart-total',root);
    if(total)total.innerHTML=money(periodRevenue)+' <span>revenue '+dashboardPeriod.toLowerCase()+'</span>';
    const recent=$('.sales-list',root);
    if(recent&&!sales.length)recent.innerHTML='<div class="empty">No sales recorded yet.<strong>Your recent sales will appear here.</strong></div>';
    const snapshot=$('.lower-grid tbody',root);
    if(snapshot&&!products.length)snapshot.innerHTML='<tr><td colspan="4"><div class="empty">No products yet.<strong>Add your first product to see the stock snapshot.</strong></div></td></tr>';
  }
  if(currentPage==='billing'){
    const select=$('#customerSelect',root);
    if(select&&!Array.from(select.options).some(o=>o.value==='__custom__'))select.add(new Option('Type your own','__custom__'));
    const payment=$('#paymentSelect',root);
    if(payment){const credit=Array.from(payment.options).find(o=>o.value==='Credit'||o.textContent==='Credit');if(credit){credit.value='Credit';credit.textContent='Khata / Udhaar';}}
    const customerField=select&&select.closest('.field-group');
    if(customerField&&!$('#customerPhone',root)){
      const custom=document.createElement('div');custom.className='field-group';custom.id='customCustomerGroup';custom.style.display='none';custom.innerHTML='<label for="customCustomerName">Customer name</label><input id="customCustomerName" type="text" placeholder="Enter customer name">';
      const phone=document.createElement('div');phone.className='field-group';phone.id='customerPhoneGroup';phone.innerHTML='<label for="customerPhone">Customer phone / WhatsApp</label><input id="customerPhone" type="tel" placeholder="03xxxxxxxxx" autocomplete="tel">';
      customerField.after(custom);custom.after(phone);
    }
    $$('.cart-item',root).forEach((row,i)=>{const item=cart[i],main=$('.cart-item-main',row),small=$('.cart-item-main small',row);if(item&&small&&!$('.edit-price-btn',small)){const button=document.createElement('button');button.type='button';button.className='edit-price-btn';button.dataset.action='edit-cart-price';button.dataset.id=String(item.id);button.title='Edit price for this sale only';button.setAttribute('aria-label','Edit sale price');button.textContent='✎';small.appendChild(button);}if(item&&main&&editingCartPriceId===item.id&&!$('[data-cart-price-input="'+item.id+'"]',main)){const editor=document.createElement('div');editor.style.cssText='display:flex;gap:6px;align-items:center;margin-top:8px;flex-wrap:wrap';editor.innerHTML='<input data-cart-price-input="'+item.id+'" type="number" min="0" step="1" value="'+item.price+'" aria-label="New sale price" style="width:125px;max-width:100%;padding:7px;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:var(--text);font-size:11px"><button type="button" class="btn small primary" data-action="save-cart-price" data-id="'+item.id+'">Save</button><button type="button" class="btn small" data-action="cancel-cart-price" data-id="'+item.id+'">Cancel</button>';main.appendChild(editor);}});
    const complete=$('[data-action="checkout"]',root);
    if(complete){complete.textContent='Complete Sale';if(!$( '[data-action="share-bill"]',root)){const share=document.createElement('button');share.type='button';share.className='btn full';share.dataset.action='share-bill';share.textContent='Share Bill';share.disabled=cart.length===0&&!lastReceipt;complete.after(share);}}
  const footer=$('.footer-note',root);if(footer)footer.textContent='MA Collection · Shop workspace';
  }
  const emptyConfig={
    customers:{items:customers,cols:6,title:'No customers found',detail:'Add your first customer to get started.'},
    suppliers:{items:suppliers,cols:6,title:'No suppliers found',detail:'Add your first supplier to maintain vendor records.'},
    'purchase-orders':{items:purchaseOrders,cols:7,title:'No purchase orders yet',detail:'Create your first purchase order when you are ready.'},
    expenses:{items:expenses,cols:5,title:'No expenses recorded',detail:'Add an expense to begin tracking shop costs.'},
    inventory:{items:products,cols:6,title:'No products yet',detail:'Add a product to start tracking stock.'}
  };
  const empty=emptyConfig[currentPage];
  if(empty&&!empty.items.length){const body=$('tbody',root);if(body)body.innerHTML='<tr><td colspan="'+empty.cols+'"><div class="empty"><strong>'+empty.title+'</strong>'+empty.detail+'</div></td></tr>';}
  if(currentPage==='settings'){
    const phone=$('input[name="phone"]',root);if(phone&&phone.value==='0300 123 4567')phone.value='';
    const address=$('input[name="address"]',root);if(address&&address.value==='Gulberg, Lahore, Pakistan')address.value='';
  }
};

function normalizePakPhone(value){
  let digits=String(value||'').replace(/\D/g,'');
  if(digits.startsWith('0092'))digits=digits.slice(2);
  if(digits.startsWith('0'))digits='92'+digits.slice(1);
  else if(digits.startsWith('3')&&digits.length===10)digits='92'+digits;
  return digits;
}
function pdfEscape(value){return String(value??'').replace(/[^\x20-\x7E]/g,'?').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');}
function saleTotals(s){
  const itemsTotal=s.items.reduce((sum,i)=>sum+Number(i.price)*Number(i.qty),0);
  const subtotal=Number.isSafeInteger(s.subtotal)?s.subtotal:itemsTotal;
  const discount=Number.isSafeInteger(s.discount)?s.discount:Math.max(0,subtotal-Number(s.total));
  // Actual payments from sale_payments (exclude 'khata' method: it is a charge record at sale time, not payment received)
  const salePaymentPaid=(s.paymentDetails||[]).filter(p=>p.method!=='khata').reduce((sum,p)=>sum+Number(p.amount||0),0);
  // Per-sale allocations from payment_allocations (actual money allocated to this specific sale)
  const allocationPaid=(s.allocations||[]).reduce((sum,p)=>sum+Number(p.amount||0),0);
  let paid=salePaymentPaid+allocationPaid;
  // Fallback for sales loaded without payment details (e.g. lastReceipt from checkout, pre-migration records)
  if(paid===0&&!s.paymentDetails&&!s.allocations){
    paid=(s.payment==='Credit'||s.status==='Pending')?0:Number(s.total);
  }
  const remaining=Math.max(0,Number(s.total)-paid);
  return {subtotal,discount,total:Number(s.total),paid,remaining};
}
function createReceiptPdf(sale){
  const t=saleTotals(sale);
  const lines=['MA COLLECTION','SHOP BILL / INVOICE','Invoice: #'+sale.id,'Date: '+dateTime(sale.date),'Customer: '+(sale.customer||'Walk-in customer')];
  if(sale.phone)lines.push('Phone: +'+normalizePakPhone(sale.phone));
  lines.push('----------------------------------------','ITEMS');
  sale.items.forEach(item=>lines.push(item.name+' x '+item.qty+' @ Rs '+item.price+' = Rs '+(item.price*item.qty)));
  lines.push('----------------------------------------','Subtotal: Rs '+t.subtotal,'Discount: Rs '+t.discount,'Paid: Rs '+t.paid,'Remaining: Rs '+t.remaining,'TOTAL: Rs '+t.total,'Payment: '+sale.payment);
  if(sale.payment==='Credit')lines.push('Payment status: Outstanding / Khata');
  lines.push('Thank you for shopping with MA Collection.');
  const printable=lines.slice(0,40);
  const stream=printable.map((line,i)=>'BT /F1 '+(i===0?16:10)+' Tf 48 '+(790-i*18)+' Td ('+pdfEscape(line)+') Tj ET').join('\n');
  const objects=[
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream'
  ];
  let pdf='%PDF-1.4\n',offsets=[0];
  objects.forEach((obj,i)=>{offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\n'+obj+'\nendobj\n';});
  const xref=pdf.length;pdf+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n';
  offsets.slice(1).forEach(offset=>{pdf+=String(offset).padStart(10,'0')+' 00000 n \n';});
  pdf+='trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
  return new Blob([pdf],{type:'application/pdf'});
}
function downloadReceiptPdf(sale){
  const blob=createReceiptPdf(sale),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='MA-Collection-Bill-'+sale.id+'.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
async function shareBillFile(sale){
  const blob=createReceiptPdf(sale);
  const file=new File([blob],'MA-Collection-Bill-'+sale.id+'.pdf',{type:'application/pdf'});
  const phone=normalizePakPhone(sale.phone);
  const waUrl=phone.length>=11?'https://wa.me/'+phone:null;
  const supported=!(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]}));
  if(!supported){
    try{
      await navigator.share({files:[file],title:'MA Collection Bill #'+sale.id});
      toast('Bill shared using your device share sheet.');
      return;
    }catch(error){
      if(error&&error.name==='AbortError')return;
    }
  }
  const buttons=[`<button class="btn primary" data-action="download-receipt-pdf" data-id="${sale.id}">Download PDF</button>`];
  if(waUrl)buttons.push(`<button class="btn" data-action="share-whatsapp" data-id="${sale.id}">Send via WhatsApp</button>`);
  else buttons.push(`<button class="btn" data-action="close-modal">Close</button>`);
  showModal('Share Bill #'+sale.id,'Choose how to share the invoice.',buttons.join(' '),{footer:false});
}
function saleForShare(id){return findById(sales,id)||lastReceipt;}
const __originalOpenReceipt=openReceipt;
openReceipt=function(sale){
  __originalOpenReceipt(sale);
  const receipt=$('#modalHost .receipt');
  if(receipt){
    const url=storeLogoUrl();
    if(url&&!receipt.querySelector('.receipt-logo')){
      const img=document.createElement('img');
      img.className='receipt-logo';img.src=url;img.alt='Store logo';
      img.style.cssText='display:block;max-width:110px;max-height:70px;object-fit:contain;margin:0 auto 10px';
      const brand=receipt.querySelector('.receipt-brand');
      if(brand)brand.before(img);else receipt.prepend(img);
    }
  }
  if(receipt){const foot=Array.from(receipt.children).find(n=>/demo receipt|no payment was processed/i.test(n.textContent));if(foot)foot.remove();if(sale.phone&&!Array.from(receipt.querySelectorAll('.receipt-line')).some(n=>/Phone/i.test(n.textContent))){const row=document.createElement('div');row.className='receipt-line';row.innerHTML='<span>Phone</span><span>+'+e(normalizePakPhone(sale.phone))+'</span>';const customer=Array.from(receipt.querySelectorAll('.receipt-line')).find(n=>/Customer/i.test(n.textContent));if(customer)customer.after(row);}}
};
/* All data-action clicks are handled by handleAction above. Do not register a second click handler here. */
document.addEventListener('change',function(ev){
  if(ev.target.matches('form select[data-custom-select]')){const input=ev.target.parentElement.querySelector('[data-custom-select-input]');if(input){input.style.display=ev.target.value==='__custom_option__'?'block':'none';if(ev.target.value==='__custom_option__')input.focus();else input.value='';}}
  if(ev.target.id==='customerSelect'){
    const custom=$('#customCustomerGroup'),name=$('#customCustomerName'),phone=$('#customerPhone');
    if(custom)custom.style.display=ev.target.value==='__custom__'?'block':'none';
    const customer=customers.find(c=>c.name===ev.target.value);
    if(phone)phone.value=customer?customer.phone:'';
    if(name&&ev.target.value!=='__custom__')name.value='';
  }
  if(ev.target.matches('form[data-form="po"] select[name="productId"]')){
    const form=ev.target.closest('form'),product=products.find(x=>x.name===ev.target.value);
    if(form?.elements.unitCost)form.elements.unitCost.value=product?.cost||0;
  }
});
document.addEventListener('blur',function(ev){if(ev.target&&ev.target.id==='customerPhone'){const normalized=normalizePakPhone(ev.target.value);if(normalized.length>=11)ev.target.value=normalized;}},true);
window.addEventListener('ma-store-ready', function () {
  if (window.MA_STORE && currentRole()) {
    const storeId=window.MA_STORE.id,generation=++storeDataGeneration;
    clearStoreScopedState();
    renderPage();
    Promise.allSettled([loadProductsFromDatabase(),loadCustomersFromDatabase(),loadKhataLedgerFromDatabase(),loadSalesFromDatabase(),loadSuppliersFromDatabase(),loadExpensesFromDatabase(),loadPurchaseOrdersFromDatabase(),loadEmployeesFromDatabase(),loadStoreSettings()]).then(results=>{if(!isCurrentStoreLoad(storeId,generation))return;if(results.some(r=>r.status==='rejected'))toast('Some store data could not load. Check connection and permissions.');renderPage();});
  }
});
window.addEventListener('ma-store-cleared',function(){storeDataGeneration++;clearStoreScopedState();renderPage();});
renderPage();
})();
