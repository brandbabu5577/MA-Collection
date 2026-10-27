// Fake @supabase/supabase-js for UI smoke tests. Records every call in window.__calls.
const STORE='11111111-1111-1111-1111-111111111111';
const P1='22222222-2222-2222-2222-222222222221', C1='33333333-3333-3333-3333-333333333331';
const db={
  store_members:[{store_id:STORE,role:'owner',stores:{name:'Test Shop',business_type:'Clothing & garments',phone:'',address:'',logo_path:''}}],
  categories:[{id:'c-1',name:'Unstitched',description:''}],
  products:[{id:P1,store_id:STORE,category_id:'c-1',name:'Lawn Suit',sku:'LS-1',price:3000,stock_quantity:10,min_stock:2,color:'Blue',size:'M',is_active:true,created_at:'2026-10-01T00:00:00Z'}],
  products_costs:[{id:P1,cost:2000}],
  customers:[{id:C1,name:'Ayesha',phone:'923001234567',email:null,khata_balance:1500,order_count:2,created_at:'2026-10-01T00:00:00Z'}],
  khata_entries:[{id:'k1',customer_id:C1,entry_type:'credit_sale',amount_change:1500,balance_after:1500,note:null,created_at:'2026-10-02T00:00:00Z'}],
  sales:[{id:'s-1',sale_number:1001,customer_id:C1,customer_name:'Ayesha',customer_phone:null,sold_at:'2026-10-02T00:00:00Z',subtotal:3000,discount:0,total:3000,payment_method:'cash',status:'completed',sale_items:[{product_id:P1,product_name:'Lawn Suit',quantity:1,unit_price:3000}]}],
  sales_financials:[{id:'s-1',profit:1000}],
  expenses:[{id:'e-1',title:'Rent',category:'Rent',amount:20000,expense_date:'2026-10-01',note:null}],
  suppliers:[{id:'sp-1',name:'Al-Noor',contact_person:'Usman',phone:'923001112222',category:'Fabric',payable_balance:0}],
  employees:[], stores:[]
};
window.__calls=[];
function q(table){
  const st={table,op:'select',filters:[],payload:null};
  const b={
    select(){return b;}, eq(c,v){st.filters.push([c,v]);return b;}, in(){return b;}, order(){return b;}, limit(){return b;},
    insert(p){st.op='insert';st.payload=p;return b;}, update(p){st.op='update';st.payload=p;return b;}, delete(){st.op='delete';return b;},
    single(){return b;}, maybeSingle(){st.single=true;return b;},
    then(res,rej){window.__calls.push({type:'from',...st});
      let data=st.op==='select'?(db[table]||[]):(st.op==='delete'?null:{id:'new-id'});
      if(st.single&&Array.isArray(data))data=data[0]||null;
      return Promise.resolve({data,error:null}).then(res,rej);}
  };return b;
}
export function createClient(){
  const user={id:'u-1',email:'owner@test'};
  return {
    auth:{getSession:async()=>({data:{session:{user}}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}};},signOut:async()=>({error:null})},
    from:q,
    rpc:async(name,args)=>{window.__calls.push({type:'rpc',name,args});
      if(name==='create_sale')return {data:[{sale_id:'s-new',sale_number:1002,total:args.p_items.reduce((s,i)=>s+i.quantity*i.unit_price,0)-args.p_discount}],error:null};
      if(name==='record_khata_payment')return {data:[{payment_id:'p-1',balance_after:1000}],error:null};
      if(name==='adjust_stock')return {data:15,error:null};
      return {data:null,error:null};},
    storage:{from(){return {getPublicUrl(){return {data:{publicUrl:''}}}}}},
    functions:{invoke:async()=>({data:null,error:null})}
  };
}
export default {createClient};
