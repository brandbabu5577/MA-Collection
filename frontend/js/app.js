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
let cart=[];
let lastReceipt=null;
let editingCartPriceId=null;
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
 {name:'Seasonal',count:0,description:'Limited-time collections'}
];
const pageMeta = {
 dashboard:['Overview','A clear picture of your store, all in one place.'],billing:['New sale','Build a bill, take payment, and keep your stock up to date.'],sales:['Sales history','Track every order, payment, and receipt.'],products:['Products','Manage your collection, prices, sizes, and product details.'],inventory:['Inventory','Monitor stock levels and make quick stock adjustments.'],categories:['Categories','Keep your collection organized by product type.'],customers:['Customers & khata','Know your regulars and keep customer credit in check.'],suppliers:['Suppliers','Manage your vendors and outstanding balances.'],employees:['Employees','Manage the team members working at your counter.'],'purchase-orders':['Purchase orders','Keep replenishment orders organized from request to receipt.'],expenses:['Expenses','Track your day-to-day operating costs.'],reports:['Reports & analytics','Understand sales, profit, stock value, and customer trends.'],settings:['Settings','Manage your store preferences and workspace.']
};
function pageIcon(page){ const found=navGroups.flatMap(g=>g.items).find(a=>a[0]===page); return ic(found?.[2]||'dashboard'); }
function renderNav(){
 $('#navContainer').innerHTML = navGroups.map(g=>({...g,items:g.items.filter(([id])=>canAccessPage(id))})).filter(g=>g.items.length).map(g=>`<div class="nav-group"><div class="nav-label">${g.label}</div>${g.items.map(([id,label,ico])=>`<button class="nav-item ${currentPage===id?'active':''}" data-nav="${id}">${ic(ico)}<span>${label}</span>${id==='inventory'&&products.some(p=>p.stock<=p.minStock)?'<span class="nav-count">'+products.filter(p=>p.stock<=p.minStock).length+'</span>':''}</button>`).join('')}</div>`).join('');
 $('#mobileBottom').innerHTML = [['dashboard','Home','dashboard'],['billing','New sale','cart'],['products','Products','package'],['sales','Sales','receipt'],['settings','More','menu']].filter(([id])=>canAccessPage(id)).map(([id,label,ico])=>`<button class="${currentPage===id?'active':''}" data-nav="${id}">${ic(ico)}<span>${label}</span></button>`).join('');
}
function head(page,extra=''){const [title,desc]=pageMeta[page]||pageMeta.dashboard;return `<div class="page-head"><div><div class="page-kicker"><span class="kicker-dot"></span> SHOP WORKSPACE <span style="opacity:.5">/</span> ${e((pageMeta[page]||pageMeta.dashboard)[0].toUpperCase())}</div><h1>${e(title)}</h1><p class="page-desc">${e(desc)}</p></div>${extra?`<div class="head-actions">${extra}</div>`:''}</div>`;}
function stat(label,value,ico,foot='',trend=''){return `<div class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon">${ic(ico)}</span></div><div class="stat-value">${value}</div><div class="stat-footer">${trend?`<span class="trend">${trend}</span>`:''}${foot}</div></div>`;}
function productStatus(p){return p.stock<=0?'<span class="badge low">Out of stock</span>':p.stock<=p.minStock?'<span class="badge warn">Low stock</span>':'<span class="badge good">In stock</span>';}
function paymentBadge(s){return s==='Credit'?'<span class="badge warn">Credit</span>':s==='Card'?'<span class="badge good">Card</span>':'<span class="badge good">Cash</span>';}
function productRow(p){return `<tr data-search-row="products" data-search-text="${e((p.name+' '+p.sku+' '+p.category+' '+p.color).toLowerCase())}" data-product-id="${p.id}"><td><div class="product-cell"><div class="product-thumb">${ic('shirt')}</div><div><strong>${e(p.name)}</strong><small>${e(p.sku)}</small></div></div></td><td>${e(p.category)}</td><td>${e(p.size||'—')}</td><td><strong>${money(p.price)}</strong></td><td>${money(p.cost)}</td><td><div class="stock-layout"><strong>${p.stock}</strong></div></td><td>${productStatus(p)}</td><td><div class="row-actions"><button class="mini-icon" data-action="edit-product" data-id="${p.id}" aria-label="Edit product">${ic('edit')}</button><button class="mini-icon" data-action="delete-product" data-id="${p.id}" aria-label="Delete product">${ic('trash')}</button></div></td></tr>`;}
function salesRow(s){return `<tr data-search-row="sales" data-search-text="${e((s.id+' '+s.customer+' '+s.payment+' '+s.status).toLowerCase())}"><td><strong>#${s.id}</strong></td><td><div class="product-cell"><div class="person-avatar">${e(s.customer.split(' ').map(a=>a[0]).slice(0,2).join(''))}</div><div><strong>${e(s.customer)}</strong><small>${s.items.length} item${s.items.length!==1?'s':''}</small></div></div></td><td>${dateTime(s.date)}</td><td>${paymentBadge(s.payment)}</td><td><strong>${money(s.total)}</strong></td><td>${s.status==='Pending'?'<span class="badge warn">Pending</span>':'<span class="badge good">Completed</span>'}</td><td><div class="row-actions"><button class="mini-icon" data-action="view-sale" data-id="${s.id}" aria-label="View sale">${ic('eye')}</button><button class="mini-icon" data-action="print-sale" data-id="${s.id}" aria-label="Print receipt">${ic('receipt')}</button></div></td></tr>`;}
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
 <section class="panel"><div class="panel-head"><div><div class="panel-title">Quick actions</div><div class="panel-subtitle">Common tasks, one tap away</div></div></div><div class="panel-body"><div class="quick-actions"><button class="quick-action" data-nav="products"><span class="quick-action-icon">${ic('package')}</span><span><strong>Add product</strong><small>Update your catalog</small></span></button><button class="quick-action" data-nav="inventory"><span class="quick-action-icon">${ic('layers')}</span><span><strong>Stock count</strong><small>${low} items need attention</small></span></button><button class="quick-action" data-nav="customers"><span class="quick-action-icon">${ic('people')}</span><span><strong>Customer khata</strong><small>Review outstanding</small></span></button><button class="quick-action" data-nav="reports"><span class="quick-action-icon">${ic('chart')}</span><span><strong>View reports</strong><small>Track your profit</small></span></button></div></div></section></div><div class="footer-note">MA Collection · Demo workspace · All sample data stays in this preview</div>`;
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
 <section class="panel"><div class="table-toolbar"><div><strong style="font-size:12px">Stock register</strong><div class="panel-subtitle">Real-time demo quantities and minimum levels</div></div><div class="field-search">${ic('search')}<input type="search" data-local-search="inventory" placeholder="Find an item…"></div></div><div class="table-wrap"><table style="min-width:780px"><thead><tr><th>Product</th><th>Category</th><th>Current stock</th><th>Minimum level</th><th>Status</th><th style="text-align:right">Action</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
function billingPage(){
 const shown=products.filter(p=>p.stock>0&&(categoryFilter==='All'||p.category===categoryFilter));
 let totals;try{totals=calculateCartTotals(cart,$('#discountInput')?.value||0,false);}catch{totals=calculateCartTotals(cart,0,false);}const {subtotal,discount,total}=totals;
 return head('billing',`<button class="btn" data-action="clear-cart">${ic('refresh')} Clear bill</button>`)+
 `<div class="pos-layout"><section class="panel"><div class="panel-head"><div><div class="panel-title">Select products</div><div class="panel-subtitle">${products.length} products in your collection</div></div><span class="badge good">${shown.length} available</span></div><div class="panel-body" style="padding-bottom:12px"><div class="filter-bar" style="margin-bottom:14px"><div class="field-search" style="max-width:none">${ic('search')}<input type="search" data-local-search="pos-products" placeholder="Search product or SKU…"></div></div><div class="filter-tabs" style="margin-bottom:14px;overflow-x:auto">${['All',...categories.map(c=>c.name)].map(c=>`<button class="${categoryFilter===c?'active':''}" data-action="pos-category" data-category="${e(c)}">${e(c)}</button>`).join('')}</div><div class="pos-products" id="posProducts">${shown.map(p=>`<button class="pos-card" data-search-row="pos-products" data-search-text="${e((p.name+' '+p.sku+' '+p.category).toLowerCase())}" data-action="add-cart" data-id="${p.id}" style="text-align:left;color:var(--text)"><div class="pos-art">${ic('shirt',30)}</div><strong>${e(p.name)}</strong><small>${e(p.sku)} · ${p.stock} in stock</small><div class="pos-bottom"><span class="pos-price">${money(p.price)}</span><span class="add-circle">+</span></div></button>`).join('')||'<div class="empty">No matching in-stock products.</div>'}</div></div></section>
 <section class="panel cart-panel"><div class="panel-head"><div><div class="panel-title">Current bill</div><div class="panel-subtitle">Receipt #'+(1049+sales.length-7)+' · ${cart.reduce((s,i)=>s+i.qty,0)} items</div></div><button class="mini-icon" data-action="clear-cart" aria-label="Clear cart">${ic('trash')}</button></div><div class="cart-items">${cart.length?cart.map(it=>`<div class="cart-item"><div class="cart-item-main"><strong>${e(it.name)}</strong><small>${money(it.price)} / unit</small></div><div class="qty-control"><button data-action="cart-qty" data-id="${it.id}" data-delta="-1">−</button><span>${it.qty}</span><button data-action="cart-qty" data-id="${it.id}" data-delta="1">+</button></div><div class="cart-price">${money(it.price*it.qty)}</div></div>`).join(''):'<div class="empty" style="padding:28px 5px">'+ic('cart',24)+'<strong>Your bill is empty</strong>Add products to begin a sale.</div>'}</div>
 <div class="cart-fields"><div class="field-group"><label for="customerSelect">Customer</label><select id="customerSelect"><option value="Walk-in customer">Walk-in customer</option>${customers.map(c=>`<option value="${e(c.name)}">${e(c.name)}</option>`).join('')}</select></div><div class="field-group"><label for="paymentSelect">Payment method</label><select id="paymentSelect"><option>Cash</option><option>Card</option><option>Credit</option></select></div><div class="field-group"><label for="discountInput">Discount (PKR)</label><input id="discountInput" type="number" min="0" max="${subtotal}" value="0" placeholder="0" data-role="discount"></div></div>
 <div class="cart-totals"><div class="total-row"><span>Subtotal</span><strong>${money(subtotal)}</strong></div><div class="total-row"><span>Discount</span><strong>${money(discount)}</strong></div><div class="total-row grand"><span>Total due</span><strong>${money(total)}</strong></div><button class="btn primary full" data-action="checkout" ${cart.length?'':'disabled'}>${ic('check')} Complete sale</button><div class="receipt-note">${ic('receipt',13)} Receipt will be generated on completion</div></div></section></div><div class="footer-note">Demo checkout only · No payment is charged or processed.</div>`;
}
function salesPage(){
 const matches=sales.filter(s=>salesFilter==='All'||s.payment===salesFilter||s.status===salesFilter);
 return head('sales',`<button class="btn" data-action="export-sales">${ic('download')} Export</button><button class="btn primary" data-nav="billing">${ic('plus')} New sale</button>`)+
 `<div class="stats-grid grid">${stat('Total sales',sales.length,'receipt','All recorded demo sales')}${stat('Sales revenue',money(sales.reduce((s,a)=>s+a.total,0)),'wallet','Recorded transactions')}${stat('Credit outstanding',money(customers.reduce((s,c)=>s+c.balance,0)),'people','Customer balances')}${stat('Completed orders',sales.filter(s=>s.status==='Completed').length,'check','Ready receipts')}</div>
 <section class="panel"><div class="table-toolbar"><div class="filter-tabs">${['All','Cash','Card','Credit','Pending','Completed'].map(f=>`<button class="${salesFilter===f?'active':''}" data-action="sales-filter" data-filter="${f}">${f}</button>`).join('')}</div><div class="field-search">${ic('search')}<input type="search" data-local-search="sales" placeholder="Search receipt or customer…"></div></div><div class="table-wrap"><table style="min-width:790px"><thead><tr><th>Receipt</th><th>Customer</th><th>Date & time</th><th>Payment</th><th>Total</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead><tbody>${matches.map(salesRow).join('')||`<tr><td colspan="7"><div class="empty">No sales match this filter.</div></td></tr>`}</tbody></table></div><div class="pagination"><span>Sales and receipts in this demo workspace.</span><span class="page-n">${matches.length} transactions</span></div></section>`;
}
function customersPage(){
 const rows=customers.map(c=>`<tr data-search-row="customers" data-search-text="${e((c.name+' '+c.phone+' '+c.email).toLowerCase())}"><td><div class="product-cell"><div class="person-avatar">${e(c.name.split(' ').map(a=>a[0]).slice(0,2).join(''))}</div><div><strong>${e(c.name)}</strong><small>Customer since ${dateShort(c.joined)}</small></div></div></td><td>${e(c.phone)}</td><td>${c.orders}</td><td><strong>${money(c.balance)}</strong></td><td>${c.balance?'<span class="badge warn">Balance due</span>':'<span class="badge good">Clear</span>'}</td><td><div class="row-actions"><button class="mini-icon" data-action="view-customer" data-id="${c.id}" aria-label="View customer">${ic('eye')}</button>${c.balance>0?`<button class="btn small" data-action="record-khata-payment" data-id="${c.id}">Collect</button>`:''}<button class="mini-icon" data-action="edit-customer" data-id="${c.id}" aria-label="Edit customer">${ic('edit')}</button><button class="mini-icon" data-action="delete-customer" data-id="${c.id}" aria-label="Delete customer">${ic('trash')}</button></div></td></tr>`).join('');
 return head('customers',`<button class="btn" data-action="export-customers">${ic('download')} Export</button><button class="btn primary" data-action="add-customer">${ic('plus')} Add customer</button>`)+
 `<div class="stats-grid grid">${stat('Total customers',customers.length,'people','Returning and walk-in')}${stat('Outstanding khata',money(customers.reduce((s,c)=>s+c.balance,0)),'wallet','Unpaid customer balances')}${stat('Clear accounts',customers.filter(c=>!c.balance).length,'check','No balance due')}${stat('Repeat customers',customers.filter(c=>c.orders>4).length,'refresh','More than 4 orders')}</div><section class="panel"><div class="table-toolbar"><div><strong style="font-size:12px">Customer directory</strong><div class="panel-subtitle">Contact information, order history, and credit balance</div></div><div class="field-search">${ic('search')}<input type="search" data-local-search="customers" placeholder="Find customer…"></div></div><div class="table-wrap"><table style="min-width:800px"><thead><tr><th>Customer</th><th>Phone</th><th>Orders</th><th>Khata balance</th><th>Account</th><th style="text-align:right">Actions</th></tr></thead><tbody>${rows||''}</tbody></table></div></section>`;
}
function suppliersPage(){
 const rows=suppliers.map(s=>`<tr data-search-row="suppliers" data-search-text="${e((s.name+' '+s.contact+' '+s.category+' '+s.phone).toLowerCase())}"><td><div class="product-cell"><div class="person-avatar">${e(s.name.split(' ').map(a=>a[0]).slice(0,2).join(''))}</div><div><strong>${e(s.name)}</strong><small>${e(s.category)}</small></div></div></td><td>${e(s.contact)}</td><td>${e(s.phone)}</td><td><strong>${money(s.balance)}</strong></td><td>${s.balance?'<span class="badge warn">Outstanding</span>':'<span class="badge good">Settled</span>'}</td><td><div class="row-actions"><button class="mini-icon" data-action="edit-supplier" data-id="${s.id}" aria-label="Edit supplier">${ic('edit')}</button><button class="mini-icon" data-action="delete-supplier" data-id="${s.id}" aria-label="Delete supplier">${ic('trash')}</button></div></td></tr>`).join('');
 return head('suppliers',`<button class="btn" data-action="export-suppliers">${ic('download')} Export</button><button class="btn primary" data-action="add-supplier">${ic('plus')} Add supplier</button>`)+
 `<div class="stats-grid grid">${stat('Active suppliers',suppliers.length,'truck','Fabric and merchandise vendors')}${stat('Supplier balances',money(suppliers.reduce((s,a)=>s+a.balance,0)),'wallet','Payables in demo data')}${stat('Purchase orders',purchaseOrders.length,'receipt','Orders tracked')}${stat('To receive',purchaseOrders.filter(p=>p.status==='Pending').length,'box','Open purchase orders')}</div><section class="panel"><div class="table-toolbar"><div><strong style="font-size:12px">Supplier directory</strong><div class="panel-subtitle">Vendors, contact information, and balances</div></div><div class="field-search">${ic('search')}<input type="search" data-local-search="suppliers" placeholder="Find a supplier…"></div></div><div class="table-wrap"><table style="min-width:780px"><thead><tr><th>Supplier</th><th>Contact person</th><th>Phone</th><th>Balance</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
function categoriesPage(){
 return head('categories',`<button class="btn primary" data-action="add-category">${ic('plus')} Add category</button>`)+`<div class="inline-notice">${ic('info')}<div>Use categories to keep your clothing catalog tidy. Product counts are recalculated as you add or edit items.</div></div><div class="category-grid">${categories.map(c=>`<div class="category-card"><div class="category-symbol">${ic(c.name==='Accessories'?'spark':c.name==='Ready to wear'?'shirt':'tag')}</div><strong>${e(c.name)}</strong><small>${products.filter(p=>p.category===c.name).length} products · ${e(c.description)}</small><div style="display:flex;justify-content:flex-end;gap:5px;margin-top:14px"><button class="mini-icon" data-action="edit-category" data-name="${e(c.name)}" aria-label="Edit category">${ic('edit')}</button><button class="mini-icon" data-action="delete-category" data-name="${e(c.name)}" aria-label="Delete category">${ic('trash')}</button></div></div>`).join('')}</div>`;
}

async function loadEmployeesFromDatabase(){
  const client=window.MA_SUPABASE, store=window.MA_STORE;
  if(!client||!store||!store.id||store.role!=='owner')return;
  employees.splice(0,employees.length);
  try{
    const {data,error}=await client.from('employees')
      .select('id,name,role_title,phone,status')
      .eq('store_id',store.id).order('created_at',{ascending:false});
    if(error)throw error;
    employees.splice(0,employees.length,...(data||[]).map(function(r){
      return {id:r.id,name:r.name,role:r.role_title,phone:r.phone||'',
        status:r.status==='inactive'?'Inactive':'Active'};
    }));
  }catch(error){
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
    const {data,error}=await client.from('employees').delete()
      .eq('id',String(id)).eq('store_id',store.id).select('id').maybeSingle();
    if(error)throw error;
    if(!data)throw new Error('Employee record not found or access denied.');
    employees.splice(employees.indexOf(x),1);
    renderPage();
    toast('Employee removed.');
  }catch(error){
    console.error('Employee delete failed:',error);
    toast('Could not remove employee. Check owner permissions.');
  }
}

function employeesPage(){
 const rows=employees.map(x=>`<tr data-search-row="employees" data-search-text="${e((x.name+' '+x.role+' '+x.phone).toLowerCase())}"><td><div class="product-cell"><div class="person-avatar">${e(x.name.split(' ').map(a=>a[0]).slice(0,2).join(''))}</div><div><strong>${e(x.name)}</strong><small>Staff ID EMP-${String(x.id).slice(0,8).toUpperCase()}</small></div></div></td><td>${e(x.role)}</td><td>${e(x.phone)}</td><td><span class="badge good">${x.status}</span></td><td><div class="row-actions"><button class="mini-icon" data-action="edit-employee" data-id="${x.id}">${ic('edit')}</button><button class="mini-icon" data-action="delete-employee" data-id="${x.id}">${ic('trash')}</button></div></td></tr>`).join('');
 return head('employees',`<button class="btn primary" data-action="add-employee">${ic('plus')} Add employee</button>`)+`<section class="panel">${tablePanel('',`${employees.length} team members`,['Employee','Role','Phone','Status','Actions'],rows,'No employees')}</section>`;
}
function purchaseOrdersPage(){
 const rows=purchaseOrders.map(p=>`<tr data-search-row="purchase-orders" data-search-text="${e((p.id+' '+p.supplier+' '+p.status).toLowerCase())}"><td><strong>PO-${p.id}</strong></td><td>${e(p.supplier)}</td><td>${dateShort(p.date)}</td><td>${p.items} products</td><td><strong>${money(p.total)}</strong></td><td>${p.status==='Received'?'<span class="badge good">Received</span>':'<span class="badge warn">Pending</span>'}</td><td><div class="row-actions">${p.status==='Pending'?`<button class="btn small" data-action="receive-po" data-id="${p.id}">${ic('check')} Mark received</button>`:''}<button class="mini-icon" data-action="delete-po" data-id="${p.id}">${ic('trash')}</button></div></td></tr>`).join('');
 return head('purchase-orders',`<button class="btn primary" data-action="add-po">${ic('plus')} Create purchase order</button>`)+`<div class="stats-grid grid">${stat('Total orders',purchaseOrders.length,'receipt','All purchase orders')}${stat('Awaiting delivery',purchaseOrders.filter(p=>p.status==='Pending').length,'truck','Items to receive')}${stat('Ordered value',money(purchaseOrders.reduce((s,p)=>s+p.total,0)),'wallet','Sum of order totals')}${stat('Received orders',purchaseOrders.filter(p=>p.status==='Received').length,'check','Completed deliveries')}</div><section class="panel"><div class="table-toolbar"><div><strong style="font-size:12px">Purchase order register</strong><div class="panel-subtitle">Replenishment orders for your store</div></div><div class="field-search">${ic('search')}<input type="search" data-local-search="purchase-orders" placeholder="Search PO or supplier…"></div></div><div class="table-wrap"><table style="min-width:800px"><thead><tr><th>Order ID</th><th>Supplier</th><th>Date</th><th>Products</th><th>Order total</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
function expensesPage(){
 const total=expenses.reduce((s,x)=>s+x.amount,0);
 const rows=expenses.map(x=>`<tr data-search-row="expenses" data-search-text="${e((x.title+' '+x.category+' '+x.note).toLowerCase())}"><td><div><strong>${e(x.title)}</strong><div class="panel-subtitle">${e(x.note)}</div></div></td><td>${e(x.category)}</td><td>${dateShort(x.date)}</td><td><strong>${money(x.amount)}</strong></td><td><div class="row-actions"><button class="mini-icon" data-action="edit-expense" data-id="${x.id}">${ic('edit')}</button><button class="mini-icon" data-action="delete-expense" data-id="${x.id}">${ic('trash')}</button></div></td></tr>`).join('');
 return head('expenses',`<button class="btn" data-action="export-expenses">${ic('download')} Export</button><button class="btn primary" data-action="add-expense">${ic('plus')} Add expense</button>`)+`<div class="stats-grid grid">${stat('Total expenses',money(total),'wallet','All demo entries')}${stat('This month',money(total),'calendar','Recorded in current period')}${stat('Largest expense',money(Math.max(...expenses.map(x=>x.amount),0)),'chart','Single expense record')}${stat('Expense entries',expenses.length,'receipt','All categories')}</div><section class="panel"><div class="table-toolbar"><div><strong style="font-size:12px">Expense register</strong><div class="panel-subtitle">Rent, utilities, supplies, and other costs</div></div><div class="field-search">${ic('search')}<input type="search" data-local-search="expenses" placeholder="Search expenses…"></div></div><div class="table-wrap"><table style="min-width:690px"><thead><tr><th>Expense</th><th>Category</th><th>Date</th><th>Amount</th><th style="text-align:right">Actions</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
function reportsPage(){
 const gross=sales.reduce((s,x)=>s+x.total,0), profit=sales.reduce((s,x)=>s+x.profit,0), stockVal=products.reduce((s,p)=>s+p.cost*p.stock,0);
 const bars=[45,62,54,70,63,82,75,91,68,84,100,76];
 const cats=categories.map(c=>({name:c.name,amount:products.filter(p=>p.category===c.name).reduce((s,p)=>s+p.price*p.stock,0)}));
 return head('reports',`<select class="control" id="reportPeriod"><option>This month</option><option>Last 7 days</option><option>This year</option></select><button class="btn" data-action="export-report">${ic('download')} Export report</button>`)+
 `<div class="metric-cards">${stat('Gross revenue',money(gross),'wallet','Recorded sales')}${stat('Gross profit',money(profit),'chart',`${gross?Math.round(profit/gross*100):0}% margin`)}${stat('Stock cost value',money(stockVal),'layers','Current on-hand inventory')}</div>
 <div class="two-col" style="margin-bottom:16px"><section class="panel"><div class="panel-head"><div><div class="panel-title">Revenue & profit</div><div class="panel-subtitle">Month-to-date performance</div></div><span class="badge good">+16.2%</span></div><div class="panel-body"><div class="chart-total">${money(gross)} <span>total revenue</span></div><div class="report-chart">${bars.map((v,i)=>`<div class="report-bar-group"><div class="report-bar" style="height:${v*.58}%"></div><div class="report-bar ${i===10?'accent':''}" style="height:${v*.8}%"></div></div>`).join('')}</div><div class="report-labels">${['W1','W2','W3','W4','W5','W6','W7','W8','W9','W10','W11','W12'].map(x=>`<span>${x}</span>`).join('')}</div></div></section>
 <section class="panel"><div class="panel-head"><div><div class="panel-title">Revenue by category</div><div class="panel-subtitle">Current stock value at retail price</div></div></div><div class="panel-body"><div class="report-list">${cats.map((c,i)=>`<div><div class="report-list-row"><span>${e(c.name)}</span><strong>${money(c.amount)}</strong></div><div class="progress" style="margin-top:8px"><span style="width:${Math.min(100,cats.reduce((s,v)=>s+v.amount,0)?c.amount/cats.reduce((s,v)=>s+v.amount,0)*100:0)}%;background:${['var(--accent)','var(--olive)','var(--gold)','var(--surface-3)'][i%4]}"></span></div></div>`).join('')}</div></div></section></div>
 <div class="two-col"><section class="panel"><div class="panel-head"><div><div class="panel-title">Payment breakdown</div><div class="panel-subtitle">By checkout method</div></div></div><div class="panel-body"><div class="report-list">${['Cash','Card','Credit'].map((method,i)=>{const n=sales.filter(s=>s.payment===method).reduce((sum,s)=>sum+s.total,0);return `<div><div class="report-list-row"><span>${method}</span><strong>${money(n)}</strong></div><div class="progress" style="margin-top:8px"><span style="width:${gross?n/gross*100:0}%;background:${['var(--olive)','var(--accent)','var(--gold)'][i]}"></span></div></div>`}).join('')}</div></div></section><section class="panel"><div class="panel-head"><div><div class="panel-title">Stock alerts</div><div class="panel-subtitle">Items that may need restocking</div></div><button class="btn ghost small" data-nav="inventory">View stock ${ic('arrow',12)}</button></div><div class="panel-body"><div class="sales-list">${products.filter(p=>p.stock<=p.minStock).slice(0,4).map(p=>`<div class="sale-row"><div class="sale-product-icon">${ic('shirt')}</div><div class="sale-meta"><strong>${e(p.name)}</strong><span>${e(p.sku)}</span></div><div class="sale-amount">${p.stock} left<small>Min. ${p.minStock}</small></div></div>`).join('')||'<div class="empty">All items are above minimum stock.</div>'}</div></div></section></div><div class="footer-note">Reports use sample data in this frontend demonstration.</div>`;
}
function storeLogoUrl(){
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
function settingsPage(){
 const tabs=['Store profile','Sales preferences','Inventory','Appearance','Data & privacy'];
 let panel='';
 if(currentSettingsTab==='Store profile') panel=`<div class="settings-block"><h3>Store details</h3><p>These details appear on receipts and help identify your shop in this workspace.</p><form id="storeSettingsForm"><div class="form-grid"><div><label>Store name</label><input name="storeName" value="MA Collection" required></div><div><label>Business type</label><select name="businessType"><option>Clothing & garments</option><option>Retail boutique</option><option>Accessories</option></select></div><div><label>Phone number</label><input name="phone" value="0300 123 4567"></div><div><label>Currency</label><select name="currency"><option>PKR — Pakistani Rupee</option></select></div><div class="full-span"><label>Store address</label><input name="address" value="Gulberg, Lahore, Pakistan"></div></div><div style="display:flex;justify-content:flex-end;margin-top:17px"><button class="btn primary">Save changes</button></div></form></div><div class="settings-block"><h3>Store logo</h3>
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
</div></div><div class="settings-block"><h3>Store preferences</h3><p>Small defaults for your daily counter workflow.</p><div class="switch-row"><div><strong>Show SKU on product list</strong><small>Display internal product codes below item names.</small></div><button class="toggle on" data-action="toggle-setting"><span></span></button></div><div class="switch-row"><div><strong>Warn when stock is low</strong><small>Flag products at or below their minimum quantity.</small></div><button class="toggle on" data-action="toggle-setting"><span></span></button></div></div>`;
 else if(currentSettingsTab==='Sales preferences') panel=`<div class="settings-block"><h3>Billing defaults</h3><p>Customize how your demo point-of-sale behaves.</p><div class="switch-row"><div><strong>Ask for customer on each sale</strong><small>Walk-in customer is still available.</small></div><button class="toggle on" data-action="toggle-setting"><span></span></button></div><div class="switch-row"><div><strong>Allow discounts</strong><small>Discounts are applied to the bill total in this demo.</small></div><button class="toggle on" data-action="toggle-setting"><span></span></button></div><div class="switch-row"><div><strong>Show receipt after checkout</strong><small>Open a receipt preview when the sale is completed.</small></div><button class="toggle on" data-action="toggle-setting"><span></span></button></div></div>`;
 else if(currentSettingsTab==='Inventory') panel=`<div class="settings-block"><h3>Stock management</h3><p>Manage the default behavior for your clothing inventory.</p><div class="form-grid"><div><label>Default minimum stock</label><input type="number" min="0" value="5" id="defaultMinStock"></div><div><label>Stock unit</label><select><option>Pieces</option><option>Sets</option><option>Bundles</option></select></div></div><div class="switch-row"><div><strong>Allow negative inventory</strong><small>Not recommended: stock cannot go below zero in this demo.</small></div><button class="toggle" data-action="toggle-setting"><span></span></button></div><div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn primary" data-action="save-inventory-settings">Save preferences</button></div></div>`;
 else if(currentSettingsTab==='Appearance') panel=`<div class="settings-block"><h3>Appearance</h3><p>MA Collection uses a calm, light interface with warm neutral accents.</p><div class="switch-row"><div><strong>Dark appearance preview</strong><small>Toggle the preview's color scheme for your environment.</small></div><button class="toggle ${themeDark?'on':''}" data-action="toggle-theme"><span></span></button></div><div class="switch-row"><div><strong>Compact tables</strong><small>Keep lists dense for quicker scanning.</small></div><button class="toggle" data-action="toggle-setting"><span></span></button></div></div>`;
 else panel=`<div class="settings-block"><h3>Frontend demo & privacy</h3><p>This workspace is a standalone frontend demonstration. It does not connect to a backend, database, authentication provider, or payment service.</p><div class="inline-notice">${ic('info')}<div>All edits happen in the current preview session. Refreshing may reset sample changes. No real customer or payment data should be entered here.</div></div><button class="btn" data-action="reset-demo">${ic('refresh')} Reset demo data</button></div><div class="settings-block"><h3>Data tools</h3><p>Export current sample records to a local CSV file for review.</p><button class="btn" data-action="export-products">Export product catalog</button> <button class="btn" data-action="export-sales">Export sales</button></div>`;
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
  const client=window.MA_SUPABASE, store=window.MA_STORE;
  if(!client||!store||!store.id)return;

  try{
    const {data:categoryRows,error:categoryError}=await client
      .from('categories').select('id,name,description')
      .eq('store_id',store.id).order('name',{ascending:true});
    if(categoryError)throw categoryError;

    const dbCategories=Array.isArray(categoryRows)?categoryRows:[];
    if(dbCategories.length){
      categories.splice(0,categories.length,...dbCategories.map(c=>({
        id:c.id,name:c.name,description:c.description||'',count:0
      })));
    }

    const {data:rows,error:productsError}=await client
      .from('products')
      .select('id,store_id,category_id,name,sku,price,stock_quantity,min_stock,color,size,is_active,created_at')
      .eq('store_id',store.id).eq('is_active',true)
      .order('created_at',{ascending:false});
    if(productsError)throw productsError;

    const costMap=new Map();
    if(['owner','manager'].includes(store.role)){
      const {data:costRows,error:costError}=await client.rpc('get_product_costs',{
        p_requested_store_id:store.id
      });
      if(costError)console.warn('Product costs unavailable; catalog will still load:',costError);
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
function productForm(p={}){const edit=!!p.id;showModal(edit?'Edit product':'Add new product',edit?'Update details for this catalog item.':'Add an item to the MA Collection catalog.',`<form id="modalForm" data-form="product"><input type="hidden" name="id" value="${p.id||''}"><div class="form-grid">${field('Product name','name',p.name||'','text',true,'e.g. Embroidered Lawn Suit')}${field('SKU / item code','sku',p.sku||generateSku(),'text',true)}${selectField('Category','category',categories.map(c=>c.name),p.category||categories[0]?.name||'Unstitched')}${field('Retail price (PKR)','price',p.price??'','number',true,'0')}${field('Cost price (PKR)','cost',p.cost??'','number',true,'0')}${field('Stock quantity','stock',p.stock??'','number',true,'0')}${field('Minimum stock alert','minStock',p.minStock??5,'number',true,'5')}${field('Color / variant','color',p.color||'','text',false,'e.g. Olive')}${field('Size / fit','size',p.size||'','text',false,'S / M / L')}${`<div class="full-span"><label>Notes</label><textarea name="notes" placeholder="Optional product details"></textarea></div>`}</div></form>`,{formId:'modalForm',submit:edit?'Save changes':'Add product'});}
function customerForm(c={}){const edit=!!c.id;showModal(edit?'Edit customer':'Add customer',edit?'Update customer contact details.':'Add a customer to the directory.',`<form id="modalForm" data-form="customer"><input type="hidden" name="id" value="${c.id||''}"><div class="form-grid">${field('Full name','name',c.name||'','text',true,'Customer name')}${field('Phone number','phone',c.phone||'','tel',true,'03xx xxxxxxx')}${field('Email','email',c.email||'','email',false,'name@email.com')}${currentRole()==='cashier'?'':field('Khata balance (PKR)','balance',c.balance??0,'number',true,'0')}</div></form>`,{submit:edit?'Save changes':'Add customer'});}
function khataPaymentForm(c){showModal('Record Khata payment',`Outstanding balance: ${money(c.balance)}`,`<form id="modalForm" data-form="khata-payment"><input type="hidden" name="customerId" value="${c.id}"><div class="form-grid">${field('Customer','customerName',c.name,'text',true)}${field('Payment received (PKR)','amount',c.balance,'number',true,'Amount received')}<div class="full-span">${field('Note','note','','text',false,'Cash received, bank transfer, etc.')}</div></div><p class="page-desc">This reduces the customer's outstanding Khata balance and adds a ledger entry.</p></form>`,{submit:'Record payment'});}
function supplierForm(s={}){const edit=!!s.id;showModal(edit?'Edit supplier':'Add supplier',edit?'Update vendor details.':'Keep your fabric and merchandise vendors organized.',`<form id="modalForm" data-form="supplier"><input type="hidden" name="id" value="${s.id||''}"><div class="form-grid">${field('Supplier name','name',s.name||'','text',true,'Business name')}${field('Contact person','contact',s.contact||'','text',true,'Contact name')}${field('Phone number','phone',s.phone||'','tel',true,'03xx xxxxxxx')}${field('Category','category',s.category||'','text',true,'e.g. Fabric & unstitched')}${field('Outstanding balance (PKR)','balance',s.balance??0,'number',true,'0')}</div></form>`,{submit:edit?'Save changes':'Add supplier'});}
function expenseForm(x={}){const edit=!!x.id;showModal(edit?'Edit expense':'Add expense',edit?'Update this cost entry.':'Record a cost for your shop.',`<form id="modalForm" data-form="expense"><input type="hidden" name="id" value="${x.id||''}"><div class="form-grid">${field('Expense title','title',x.title||'','text',true,'e.g. Packaging supplies')}${selectField('Category','category',['Rent','Utilities','Supplies','Transport','Salaries','Other'],x.category||'Supplies')}${field('Amount (PKR)','amount',x.amount??'','number',true,'0')}${field('Date','date',x.date||todayIso(),'date',true)}<div class="full-span">${field('Note','note',x.note||'','text',false,'Optional note')}</div></div></form>`,{submit:edit?'Save changes':'Add expense'});}
function employeeForm(x={}){const edit=!!x.id;showModal(edit?'Edit employee':'Add employee',edit?'Update team member details.':'Add a team member to your store directory.',`<form id="modalForm" data-form="employee"><input type="hidden" name="id" value="${x.id||''}"><div class="form-grid">${field('Full name','name',x.name||'','text',true,'Team member name')}${field('Role','role',x.role||'Sales assistant','text',true,'Sales assistant')}${field('Phone number','phone',x.phone||'','tel',true,'03xx xxxxxxx')}${selectField('Status','status',['Active','Inactive'],x.status||'Active')}</div></form>`,{submit:edit?'Save changes':'Add employee'});}
function categoryForm(name=''){const old=categories.find(c=>c.name===name);showModal(old?'Edit category':'Add category',old?'Update category name and description.':'Create a category for your catalog.',`<form id="modalForm" data-form="category"><input type="hidden" name="oldName" value="${e(old?.name||'')}"><div class="form-grid">${field('Category name','name',old?.name||'','text',true,'e.g. Formal wear')}<div class="full-span">${field('Description','description',old?.description||'','text',false,'What items belong here?')}</div></div></form>`,{submit:old?'Save changes':'Add category'});}
function poForm(){showModal('Create purchase order','Prepare a supplier replenishment order.',`<form id="modalForm" data-form="po"><div class="form-grid">${selectField('Supplier','supplier',suppliers.map(s=>s.name),suppliers[0]?.name||'')}${field('Order date','date',todayIso(),'date',true)}${field('Number of products','items','1','number',true)}${field('Order total (PKR)','total','','number',true,'0')}</div></form>`,{submit:'Create order'});}
function openReceipt(s){lastReceipt=s;showModal('Sale receipt',`Receipt #${s.id} · ${dateTime(s.date)}`,receiptMarkup(s),{wide:false,footer:true,submit:'Print receipt'});}
function receiptMarkup(s){return `<div class="receipt"><div class="receipt-brand">${e(window.MA_STORE?.name || 'MA Collection')}</div><div class="receipt-sub">Clothing & garments · Lahore, Pakistan</div><div class="receipt-divider"></div><div class="receipt-line"><span>Receipt</span><strong>#${s.id}</strong></div><div class="receipt-line"><span>Date</span><span>${dateTime(s.date)}</span></div><div class="receipt-line"><span>Customer</span><span>${e(s.customer)}</span></div><div class="receipt-divider"></div>${s.items.map(i=>`<div class="receipt-line"><span>${e(i.name)} × ${i.qty}</span><span>${money(i.price*i.qty)}</span></div>`).join('')}<div class="receipt-divider"></div><div class="receipt-line total"><span>Total</span><strong>${money(s.total)}</strong></div><div class="receipt-line"><span>Payment method</span><span>${e(s.payment)}</span></div><div class="receipt-divider"></div><div style="font-size:10px;color:var(--muted);line-height:1.5">Thank you for shopping with us!<br>We hope to see you again.</div><div style="font-size:9px;color:var(--muted);margin-top:15px">Demo receipt · No payment was processed</div></div>`;}
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
   const p={id:id||null,name:d.name.trim(),sku:d.sku.trim(),category:d.category,price:Number(d.price),cost:Number(d.cost),stock:Number(d.stock),minStock:Number(d.minStock),color:(d.color||'').trim(),size:(d.size||'').trim()};
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
     p.id=savedId;

     if(!categories.some(c=>c.name.toLowerCase()===p.category.toLowerCase())){
       categories.push({name:p.category,description:'',count:0});
     }
     if(id){
       const index=products.findIndex(x=>String(x.id)===String(id));
       if(index>=0)products[index]=p;else products.unshift(p);
       toast('Product updated and saved to database.');
     }else{
       products.unshift(p);
       toast('Product saved to database.');
     }
     categories.forEach(c=>c.count=products.filter(x=>x.category===c.name).length);
     closeModal();
     renderPage();
   }catch(error){
     console.error('Product save failed:',error);
     const errorMessage=String(error?.message||''); if(error?.code==='23505'||/products_store_sku_uidx|duplicate key/i.test(errorMessage)){toast('This SKU already exists in this store. Choose a different SKU.');}else{toast('Product save failed: '+(errorMessage||'Check database permissions.'));}
   }
 } else if(form.dataset.form==='customer'){
   const c={id:id||Math.max(200,...customers.map(x=>x.id))+1,name:d.name.trim(),phone:normalizePakPhone(d.phone),email:d.email.trim(),balance:currentRole()==='cashier'?(findById(customers,id)?.balance??0):Number(d.balance),orders:findById(customers,id)?.orders||0,joined:findById(customers,id)?.joined||todayIso()};if(!c.name||!/^923\d{9}$/.test(c.phone)||!Number.isSafeInteger(c.balance)||c.balance<0){toast('Enter a name, valid Pakistani mobile number, and non-negative whole-number Khata balance.');return;}if(id){customers[customers.findIndex(x=>x.id===id)]=c;toast('Customer updated.');}else{customers.unshift(c);toast('Customer added.');}closeModal();renderPage();
 } else if(form.dataset.form==='khata-payment'){
   const customerId=Number(d.customerId),c=findById(customers,customerId);let amount;try{amount=toSafeWholeNumber(d.amount,'Payment amount');}catch(error){toast(error.message);return;}if(!c||amount<1||amount>c.balance){toast('Payment must be greater than zero and cannot exceed the outstanding balance.');return;}c.balance-=amount;khataLedger.unshift({id:Date.now(),customerId:c.id,customer:c.name,type:'payment',amount,date:new Date().toISOString(),note:String(d.note||'').trim()});closeModal();persistState();renderPage();toast('Khata payment recorded.');
 } else if(form.dataset.form==='supplier'){
   const s={id:id||Math.max(300,...suppliers.map(x=>x.id))+1,name:d.name.trim(),contact:d.contact.trim(),phone:normalizePakPhone(d.phone),category:d.category.trim(),balance:Number(d.balance)};if(!s.name||!/^923\d{9}$/.test(s.phone)||!Number.isSafeInteger(s.balance)||s.balance<0){toast('Enter a supplier name, valid Pakistani mobile number, and non-negative whole-number balance.');return;}if(id){suppliers[suppliers.findIndex(x=>x.id===id)]=s;toast('Supplier updated.');}else{suppliers.unshift(s);toast('Supplier added.');}closeModal();renderPage();
 } else if(form.dataset.form==='expense'){
   const x={id:id||Math.max(500,...expenses.map(a=>a.id))+1,title:d.title.trim(),category:d.category,amount:Number(d.amount),date:d.date,note:d.note.trim()};if(!x.title||!Number.isSafeInteger(x.amount)||x.amount<0){toast('Enter an expense title and non-negative whole-number amount.');return;}if(id){expenses[expenses.findIndex(a=>a.id===id)]=x;toast('Expense updated.');}else{expenses.unshift(x);toast('Expense recorded.');}closeModal();renderPage();
 } else if(form.dataset.form==='employee'){
  const client=window.MA_SUPABASE, store=window.MA_STORE;
  if(!client||!store||!store.id||store.role!=='owner'){
    toast('Only the shop owner can manage employees.');return;
  }
  const employeeId=String(d.id||'').trim();
  const name=String(d.name||'').trim();
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
        .select('id,name,role_title,phone,status').maybeSingle();
    }else{
      result=await client.from('employees').insert({...payload,store_id:store.id})
        .select('id,name,role_title,phone,status').single();
    }
    if(result.error)throw result.error;
    if(!result.data)throw new Error('No employee row returned; check Owner access.');
    const r=result.data;
    const saved={id:r.id,name:r.name,role:r.role_title,phone:r.phone||'',
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
   const old=d.oldName;const name=d.name.trim();if(!name){toast('Enter a category name.');return;}if(categories.some(c=>c.name.toLowerCase()===name.toLowerCase()&&c.name!==old)){toast('A category with this name already exists.');return;}if(old){const c=categories.find(c=>c.name===old);if(c){c.name=name;c.description=d.description;products.forEach(p=>{if(p.category===old)p.category=name;});}toast('Category updated.');}else{categories.push({name,description:d.description||'New product category',count:0});toast('Category created.');}closeModal();renderPage();
 } else if(form.dataset.form==='po'){
   const p={id:Math.max(700,...purchaseOrders.map(x=>x.id))+1,supplier:d.supplier,date:d.date,items:Number(d.items),total:Number(d.total),status:'Pending'};if(!Number.isSafeInteger(p.items)||p.items<1||!Number.isSafeInteger(p.total)||p.total<0){toast('Enter a positive whole-number item count and non-negative whole-number order total.');return;}purchaseOrders.unshift(p);closeModal();renderPage();toast('Purchase order created.');
 } else if(form.id==='storeSettingsForm'){
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
async function uploadStoreLogo(button){
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
function handleAction(action,target){if(!canPerformAction(action,target)){toast('You do not have permission to perform this action.');return;}const id=target.dataset.id, name=target.dataset.name;
 switch(action){
 case 'toggle-menu':toggleMenu();break;case 'close-menu':if(target.id==='mobileOverlay'||target===target.closest('[data-action="close-menu"]'))closeMenu();break;
 case 'close-modal':closeModal();break;case 'backdrop-close':if(target.classList.contains('modal-backdrop'))closeModal();break;
 case 'modal-submit':{const f=$('#'+target.dataset.submitForm);if(f){if(typeof f.reportValidity==='function'&&!f.reportValidity())break;try{handleFormSubmit(f);}catch(error){console.error('Modal form submission failed:',error);toast('Could not save this record. Check the fields and try again.');}}else if(lastReceipt){window.print();}break;}
 case 'store-switch':currentPage='settings';currentSettingsTab='Store profile';renderPage();break;case 'upload-store-logo':uploadStoreLogo(target);break;case 'remove-store-logo':removeStoreLogo(target);break;
 case 'help':showModal('Help center','A quick guide for this demo',`<div class="settings-block" style="padding:0 0 14px"><h3>Managing products</h3><p>Use Products to add items and set their prices and stock. Inventory lets you adjust quantities.</p></div><div class="settings-block" style="padding:14px 0"><h3>Billing a sale</h3><p>Open New sale, choose items, select the payment method, and complete the demo checkout.</p></div><div class="settings-block" style="padding:14px 0 0"><h3>Reports</h3><p>Review the sample revenue, stock and payment summaries under Reports & analytics.</p></div>`,{footer:false});break;
 case 'notifications':{const low=products.filter(p=>p.stock===0||(p.minStock>0&&p.stock<=p.minStock));const due=customers.reduce((s,c)=>s+c.balance,0);const latest=sales[0];showModal('Notifications','Current store activity',`${low.length?low.map(p=>`<div class="sale-row"><div class="sale-product-icon">${ic('info')}</div><div class="sale-meta"><strong>${p.stock===0?'Out of stock':'Low stock'}: ${e(p.name)}</strong><span>${p.stock} units available (minimum ${p.minStock}).</span></div><span class="badge warn">Stock</span></div>`).join(''):'<div class="empty">No low-stock alerts.</div>'}<div class="sale-row"><div class="sale-product-icon">${ic('wallet')}</div><div class="sale-meta"><strong>Customer Khata outstanding</strong><span>${money(due)} due across your customers.</span></div></div>${latest?`<div class="sale-row"><div class="sale-product-icon">${ic('receipt')}</div><div class="sale-meta"><strong>Latest sale</strong><span>Receipt #${latest.id} · ${money(latest.total)}</span></div></div>`:'<div class="empty">No sales recorded yet.</div>'}`,{footer:false});break;}
 case 'toggle-theme':themeDark=!themeDark;document.documentElement.style.colorScheme=themeDark?'dark':'light';renderPage();toast(themeDark?'Dark appearance enabled.':'Light appearance enabled.');break;
 case 'settings-tab':currentSettingsTab=target.dataset.tab;renderPage();break;
 case 'toggle-setting':target.classList.toggle('on');toast('Preference changed in this demo session.');break;
 case 'save-inventory-settings':toast('Inventory preferences saved.');break;
 case 'reset-demo':if(confirm('Reset sample data and reload the demo?'))resetDemo();break;
 case 'add-product':productForm();break;case 'edit-product':{const p=products.find(x=>String(x.id)===String(target.dataset.id));if(p)productForm(p);break;}
 case 'delete-product':{const p=products.find(x=>String(x.id)===String(target.dataset.id));if(p)void archiveProductFromDatabase(p);break;} case 'product-category':productFilter=target.dataset.category;renderPage();break;
 case 'pos-category':categoryFilter=target.dataset.category;renderPage();break;
 case 'add-cart':{const p=findById(products,id);if(!p||p.stock<=0){toast('This item is out of stock.');break;}const it=cart.find(x=>x.id===p.id);if(it){if(it.qty>=p.stock){toast('No more stock available for this item.');break;}it.qty++;}else cart.push({id:p.id,name:p.name,price:p.price,qty:1});renderPage();toast('Added to current bill.');break;}
 case 'cart-qty':{const it=cart.find(x=>x.id===id);if(!it)break;const delta=Number(target.dataset.delta);const p=findById(products,id);if(delta>0&&p&&it.qty>=p.stock){toast('No more stock available.');break;}it.qty+=delta;if(it.qty<=0)cart=cart.filter(x=>x.id!==id);renderPage();break;}
 case 'clear-cart':if(cart.length&&confirm('Clear all items from this bill?')){cart=[];renderPage();toast('Current bill cleared.');}else if(!cart.length)toast('Your bill is already empty.');break;
 case 'checkout':checkout();break;
 case 'share-bill':checkout({share:true});break;
 case 'clear-local-data':if(confirm('Delete all records saved in this browser? This cannot be undone.')){[products,customers,suppliers,employees,sales,expenses,purchaseOrders,khataLedger].forEach(list=>list.splice(0,list.length));categories.splice(0,categories.length,{name:'Unstitched',count:0,description:'Lawn, khaddar, formal suits'},{name:'Ready to wear',count:0,description:'Kurtis, co-ords, trousers'},{name:'Accessories',count:0,description:'Dupattas, clutches, jewellery'},{name:'Seasonal',count:0,description:'Limited-time collections'});cart=[];lastReceipt=null;localStorage.removeItem('maCollectionState');renderPage();toast('Local records cleared.');}break;
 case 'edit-cart-price':{const item=cart.find(x=>x.id===id);if(!item){toast('Cart item not found.');break;}editingCartPriceId=item.id;renderPage();break;}
 case 'save-cart-price':{const item=cart.find(x=>x.id===id),input=$('[data-cart-price-input="'+id+'"]');if(!item||!input){toast('Could not find this bill item.');break;}try{const price=toSafeWholeNumber(input.value,'Sale price');if(price===0)throw new Error('Sale price must be greater than zero.');item.price=price;editingCartPriceId=null;renderPage();toast('Sale price updated. Catalog price is unchanged.');}catch(error){toast(error.message);}break;}
 case 'cancel-cart-price':editingCartPriceId=null;renderPage();break;
 case 'sales-filter':salesFilter=target.dataset.filter;renderPage();break;
 case 'view-sale':{const s=findById(sales,id);if(s)openReceipt(s);break;}
 case 'print-sale':{const s=findById(sales,id);if(s)openReceipt(s);break;}
 case 'add-customer':customerForm();break;case 'edit-customer':{const c=findById(customers,id);if(c)customerForm(c);break;}
 case 'view-customer':{const c=findById(customers,id);if(c){const entries=khataLedger.filter(x=>x.customerId===c.id).sort((a,b)=>new Date(b.date)-new Date(a.date));showModal(c.name,'Customer account and Khata ledger',`<div class="two-col"><div class="stat-card"><div class="stat-top">Orders</div><div class="stat-value">${c.orders}</div></div><div class="stat-card"><div class="stat-top">Outstanding Khata</div><div class="stat-value">${money(c.balance)}</div></div></div><div class="settings-block" style="padding:17px 0 0"><div class="report-list-row"><span>Phone</span><strong>${e(c.phone)}</strong></div><div class="report-list-row" style="margin-top:12px"><span>Email</span><strong>${e(c.email||'—')}</strong></div><div class="report-list-row" style="margin-top:12px"><span>Customer since</span><strong>${dateShort(c.joined)}</strong></div></div><div class="settings-block" style="padding:17px 0 0"><h3>Khata ledger</h3><p>Credit sales and payments received for this customer.</p>${entries.length?entries.map(x=>`<div class="sale-row"><div class="sale-meta"><strong>${e(x.type==='charge'?'Credit sale':'Payment received')}</strong><span>${dateTime(x.date)}${x.note?' · '+e(x.note):''}</span></div><div class="sale-amount" style="color:${x.type==='charge'?'var(--red)':'var(--olive)'}">${x.type==='charge'?'+':'−'}${money(x.amount)}</div></div>`).join(''):'<div class="empty">No Khata transactions recorded yet.</div>'}</div>${c.balance>0?`<button class="btn primary full" data-action="record-khata-payment" data-id="${c.id}">Record payment received</button>`:''}`,{footer:false});}break;}
 case 'record-khata-payment':{const c=findById(customers,id);if(c&&c.balance>0)khataPaymentForm(c);else toast('This customer has no outstanding balance.');break;}
 case 'delete-customer':{const c=findById(customers,id);if(c&&confirm(`Delete customer ${c.name}?`)){customers.splice(customers.indexOf(c),1);renderPage();toast('Customer removed.');}break;}
 case 'add-supplier':supplierForm();break;case 'edit-supplier':{const s=findById(suppliers,id);if(s)supplierForm(s);break;}
 case 'delete-supplier':{const s=findById(suppliers,id);if(s&&confirm(`Delete supplier ${s.name}?`)){suppliers.splice(suppliers.indexOf(s),1);renderPage();toast('Supplier removed.');}break;}
 case 'add-expense':expenseForm();break;case 'edit-expense':{const x=findById(expenses,id);if(x)expenseForm(x);break;}
 case 'delete-expense':{const x=findById(expenses,id);if(x&&confirm(`Delete expense ${x.title}?`)){expenses.splice(expenses.indexOf(x),1);renderPage();toast('Expense removed.');}break;}
 case 'add-employee':employeeForm();break;case 'edit-employee':{const x=employees.find(function(a){return String(a.id)===String(id);});if(x)employeeForm(x);break;}
 case 'delete-employee':{deleteEmployeeFromDatabase(id);break;}
  case 'add-category':categoryForm();break;case 'edit-category':categoryForm(name);break;
 case 'delete-category':{const c=categories.find(c=>c.name===name);if(!c)break;if(products.some(p=>p.category===name)){toast('Move or edit products in this category before deleting it.');break;}if(confirm(`Delete category ${name}?`)){categories.splice(categories.indexOf(c),1);renderPage();toast('Category deleted.');}break;}
 case 'add-po':poForm();break;case 'receive-po':{const p=findById(purchaseOrders,id);if(p){p.status='Received';renderPage();toast('Purchase order marked received. Add received quantities from Inventory.');}break;}
 case 'delete-po':{const p=findById(purchaseOrders,id);if(p&&confirm(`Delete PO-${p.id}?`)){purchaseOrders.splice(purchaseOrders.indexOf(p),1);renderPage();toast('Purchase order deleted.');}break;}
 case 'adjust-stock':adjustStockForm(id);break;case 'stock-adjustment':adjustStockForm(null);break;
 case 'export-products':doExport('products');break;case 'export-inventory':doExport('inventory');break;case 'export-sales':doExport('sales');break;case 'export-customers':doExport('customers');break;case 'export-suppliers':doExport('suppliers');break;case 'export-expenses':doExport('expenses');break;case 'export-report':doExport('report');break;case 'export-dashboard':doExport('dashboard');break;
 }
}
function adjustStockForm(id){const p=id?findById(products,id):products[0];showModal(id?'Adjust stock':'Stock adjustment',id?'Update inventory for one product.':'Record a quantity correction or received stock.',`<form id="modalForm" data-form="stock"><div class="form-grid">${selectField('Product','productId',products.map(p=>p.name),p?.name||products[0]?.name)}${selectField('Adjustment type','type',['Add stock','Remove stock','Set exact quantity'],'Add stock')}${field('Quantity','quantity','1','number',true,'0')}<div class="full-span"><label>Reason</label><input name="reason" placeholder="e.g. New stock received"></div></div></form>`,{submit:'Update stock'});}
function checkout(){
 if(!cart.length){toast('Add at least one product to the bill.');return;}
 const customer=$('#customerSelect')?.value||'Walk-in customer',payment=$('#paymentSelect')?.value||'Cash';
 let totals;try{totals=calculateCartTotals(cart,$('#discountInput')?.value||0,true);}catch(error){toast(error.message);return;}
 const {total}=totals;
 for(const it of cart){const p=findById(products,it.id);let qty,stock;try{qty=toSafeWholeNumber(it.qty,'Quantity');stock=toSafeWholeNumber(p?.stock,'Stock');}catch(error){toast(error.message);return;}if(!p||qty<1||stock<qty){toast(`Not enough stock for ${it.name}.`);return;}}
 const customerRecord=customers.find(c=>c.name===customer);let nextCustomerBalance=null;
 if(payment==='Credit'){if(!customerRecord){toast('Select a registered customer for a credit/khata sale.');return;}try{nextCustomerBalance=safeAdd(toSafeWholeNumber(customerRecord.balance,'Customer balance'),total,'Customer khata balance');}catch(error){toast(error.message);return;}}
 let cost,profit;try{cost=cart.reduce((sum,it)=>{const p=findById(products,it.id);if(!p)throw new Error(`Product not found: ${it.name}.`);return safeAdd(sum,safeMultiply(toSafeWholeNumber(p.cost,'Cost price'),toSafeWholeNumber(it.qty,'Quantity'),'Item cost'),'Total cost');},0);profit=safeAdd(total,-cost,'Profit');}catch(error){toast(error.message);return;}
 const sale={id:Math.max(1040,...sales.map(s=>s.id))+1,customer,date:new Date().toISOString(),items:cart.map(it=>({productId:it.id,name:it.name,qty:it.qty,price:it.price})),total,payment,status:payment==='Credit'?'Pending':'Completed',profit};
 cart.forEach(it=>{const p=findById(products,it.id);p.stock-=it.qty;});sales.unshift(sale);
 if(customerRecord){if(payment==='Credit')customerRecord.balance=nextCustomerBalance;customerRecord.orders=safeAdd(customerRecord.orders,1,'Customer order count');}
 lastReceipt=sale;cart=[];renderPage();openReceipt(sale);toast('Sale completed. Demo inventory was updated.');
}
function formSubmitDelegation(ev){const form=ev.target.closest('form');if(!form)return;ev.preventDefault();if(form.dataset.form==='stock'){const d=Object.fromEntries(new FormData(form).entries()),p=products.find(p=>p.name===d.productId);let q;try{q=toSafeWholeNumber(d.quantity,'Stock quantity');}catch(error){toast(error.message);return;}if(!p){toast('Select a valid product.');return;}try{const current=toSafeWholeNumber(p.stock,'Current stock');if(d.type==='Add stock')p.stock=safeAdd(current,q,'Updated stock');else if(d.type==='Remove stock'){if(q>current){toast('Cannot remove more stock than is available.');return;}p.stock=current-q;}else p.stock=q;}catch(error){toast(error.message);return;}closeModal();renderPage();toast(`Stock updated for ${p.name}.`);return;}handleFormSubmit(form);}
function applySearch(input){const key=input.dataset.localSearch;const query=input.value.trim().toLowerCase();$$(`[data-search-row="${key}"]`).forEach(row=>{row.hidden=!row.dataset.searchText.includes(query);});}
document.addEventListener('click',ev=>{
 const nav=ev.target.closest('[data-nav]');if(nav){navigate(nav.dataset.nav);return;}
 const target=ev.target.closest('[data-action]');if(target){if(target.dataset.action==='backdrop-close'&&ev.target!==target)return;if(target.dataset.action==='close-menu'&&target.id!=='mobileOverlay')return;handleAction(target.dataset.action,target);return;}
});
document.addEventListener('submit',formSubmitDelegation);
document.addEventListener('input',ev=>{if(ev.target.matches('[data-local-search]'))applySearch(ev.target);});
document.addEventListener('change',ev=>{if(ev.target.id==='productCategoryFilter'){productFilter=ev.target.value;renderPage();}if(ev.target.id==='dashboardPeriod'){toast(`Sales overview updated: ${ev.target.value.toLowerCase()}.`);}if(ev.target.id==='reportPeriod'){toast(`Report period changed to ${ev.target.value.toLowerCase()}.`);}if(ev.target.id==='discountInput'){const oldPage=currentPage;if(oldPage==='billing'){const val=ev.target.value;const scroll=$('#pageContent').scrollTop;renderPage();const inp=$('#discountInput');if(inp)inp.value=val;}}});
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
    const monthly=sales.filter(s=>{const d=new Date(s.date),n=new Date();return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear()}).reduce((sum,s)=>sum+s.total,0);
    if(values[0])values[0].textContent=money(todaySales.reduce((sum,s)=>sum+s.total,0));
    if(values[1])values[1].textContent=money(todaySales.reduce((sum,s)=>sum+s.profit,0));
    if(values[2])values[2].textContent=products.reduce((sum,p)=>sum+p.stock,0).toLocaleString();
    if(values[3])values[3].textContent=money(customers.reduce((sum,c)=>sum+c.balance,0));
    const chart=$('.bar-chart',root);
    const days=Array.from({length:14},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(13-i));const key=d.toISOString().slice(0,10);return {day:d.getDate(),total:sales.filter(s=>String(s.date).slice(0,10)===key).reduce((sum,s)=>sum+s.total,0)}});
    const max=Math.max(1,...days.map(d=>d.total));
    if(chart)chart.innerHTML=days.map((d,i)=>'<div class="bar-col"><div class="bar '+(i===13?'emph':'')+'" style="height:'+(d.total?Math.max(2,Math.round(d.total/max*88)):0)+'%"></div></div>').join('');
    const labels=$('.dashboard-main .chart-labels',root);
    if(labels)labels.innerHTML=days.map(d=>'<span>'+d.day+'</span>').join('');
    const total=$('.dashboard-main .chart-total',root);
    if(total)total.innerHTML=money(monthly)+' <span>revenue this month</span>';
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
  root.querySelectorAll('.footer-note,.panel-subtitle,.settings-block h3,.settings-block p,.receipt-note').forEach(node=>{if(!node.children.length)node.textContent=node.textContent.replace(/\bdemo\b/ig,'').replace(/\bsample\b/ig,'your').replace(/frontend demonstration/ig,'local workspace').replace(/\s{2,}/g,' ').trim();});
  if(currentPage==='settings'){
    const heading=Array.from(root.querySelectorAll('.settings-block h3')).find(n=>/privacy/i.test(n.textContent));
    if(heading){heading.textContent='Local data & privacy';const p=heading.nextElementSibling;if(p)p.textContent='Records are saved in this browser only and are not synced to other devices. Configure Supabase for secure shared storage.';}
    const clear=$('[data-action="reset-demo"]',root);if(clear){clear.dataset.action='clear-local-data';clear.innerHTML='Clear all local records';}
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
function createReceiptPdf(sale){
  const subtotal=Number.isSafeInteger(sale.subtotal)?sale.subtotal:sale.items.reduce((sum,item)=>sum+item.price*item.qty,0);
  const discount=Number.isSafeInteger(sale.discount)?sale.discount:Math.max(0,subtotal-sale.total);
  const lines=['MA COLLECTION','SHOP BILL / INVOICE','Invoice: #'+sale.id,'Date: '+dateTime(sale.date),'Customer: '+(sale.customer||'Walk-in customer')];
  if(sale.phone)lines.push('Phone: +'+normalizePakPhone(sale.phone));
  lines.push('----------------------------------------','ITEMS');
  sale.items.forEach(item=>lines.push(item.name+' x '+item.qty+' @ Rs '+item.price+' = Rs '+(item.price*item.qty)));
  lines.push('----------------------------------------','Subtotal: Rs '+subtotal,'Discount: Rs '+discount,'TOTAL: Rs '+sale.total,'Payment: '+sale.payment);
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
  const blob=createReceiptPdf(sale),file=new File([blob],'MA-Collection-Bill-'+sale.id+'.pdf',{type:'application/pdf'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],title:'MA Collection Bill #'+sale.id});toast('Bill shared using your device share sheet.');return}catch(error){if(error&&error.name==='AbortError')return;}
  }
  const phone=normalizePakPhone(sale.phone);
  if(phone.length>=11){window.open('https://wa.me/'+phone,'_blank','noopener,noreferrer');toast('PDF downloaded. Attach the PDF in WhatsApp and press Send.');}
  else toast('PDF downloaded. Add a customer phone number to open the WhatsApp chat.');
}
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
const __originalCheckout=checkout;
checkout=function(options){
  const share=!!(options&&options.share);
  if(!cart.length){if(share&&lastReceipt){shareBillFile(lastReceipt);return;}toast('Add at least one product to the bill.');return;}
  const oldReceipt=lastReceipt, selected=$('#customerSelect'), phoneField=$('#customerPhone'), customField=$('#customCustomerName');
  let phone=phoneField?phoneField.value:'';
  if(selected&&selected.value==='__custom__'){
    const name=customField?customField.value.trim():'';
    if(!name){toast('Enter the customer name or select a registered customer.');return;}
    const option=new Option(name,name);selected.add(option);selected.value=name;
  }
  if(String(phone||'').trim()){const normalized=normalizePakPhone(phone);if(!/^923\d{9}$/.test(normalized)){toast('Enter a valid Pakistani mobile number, e.g. 03xxxxxxxxx.');return;}phone=normalized;}
  let totals;try{totals=calculateCartTotals(cart,$('#discountInput')?$('#discountInput').value:0,true);}catch(error){toast(error.message);return;}
  __originalCheckout();
  if(!lastReceipt||lastReceipt===oldReceipt)return;
  lastReceipt.phone=normalizePakPhone(phone);lastReceipt.subtotal=totals.subtotal;lastReceipt.discount=totals.discount;
  if(lastReceipt.payment==='Credit'){const creditCustomer=customers.find(c=>c.name===lastReceipt.customer);if(creditCustomer)khataLedger.unshift({id:Date.now(),customerId:creditCustomer.id,customer:creditCustomer.name,type:'charge',amount:lastReceipt.total,date:lastReceipt.date,note:'Credit sale #'+lastReceipt.id});}
  persistState();closeModal();
  if(share)shareBillFile(lastReceipt);
  else{downloadReceiptPdf(lastReceipt);openReceipt(lastReceipt);}
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
});
document.addEventListener('blur',function(ev){if(ev.target&&ev.target.id==='customerPhone'){const normalized=normalizePakPhone(ev.target.value);if(normalized.length>=11)ev.target.value=normalized;}},true);
window.addEventListener('ma-store-ready', function () {
  if (window.MA_STORE && currentRole()) {
    if(currentRole()==='owner') loadEmployeesFromDatabase();
    renderPage();
    void loadProductsFromDatabase();
  }
});
renderPage();
})();
