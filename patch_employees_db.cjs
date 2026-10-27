'use strict';
const fs = require('node:fs');
const path = require('node:path');

const file = path.resolve('frontend/js/app.js');
let s = fs.readFileSync(file, 'utf8');

function replaceOnce(oldText, newText, label) {
  const i = s.indexOf(oldText);
  if (i < 0 || s.indexOf(oldText, i + oldText.length) >= 0) {
    throw new Error('Patch stopped safely: ' + label);
  }
  s = s.slice(0, i) + newText + s.slice(i + oldText.length);
}

const helper = String.raw`
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
`;

replaceOnce('function employeesPage(){', helper + '\nfunction employeesPage(){', 'employee database helpers');
replaceOnce('Staff ID EMP-${x.id}', 'Staff ID EMP-${String(x.id).slice(0,8).toUpperCase()}', 'employee ID label');
replaceOnce(
  'Add a team member to the demo directory.',
  'Add a team member to your store directory.',
  'employee form text'
);

const start = s.indexOf("} else if(form.dataset.form==='employee'){");
const end = s.indexOf("} else if(form.dataset.form==='category'){", start);
if (start < 0 || end < 0) throw new Error('Employee form branch not found; no file written.');

const branch = String.raw`} else if(form.dataset.form==='employee'){
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
  `;

s = s.slice(0, start) + branch + s.slice(end);

replaceOnce(
  "case 'edit-employee':{const x=findById(employees,id);if(x)employeeForm(x);break;}",
  "case 'edit-employee':{const x=employees.find(function(a){return String(a.id)===String(id);});if(x)employeeForm(x);break;}",
  'employee edit action'
);

const deleteStart = s.indexOf("case 'delete-employee':{");
const categoryStart = s.indexOf("case 'add-category':", deleteStart);
if (deleteStart < 0 || categoryStart < 0) {
  throw new Error('Employee delete action not found; no file written.');
}
s = s.slice(0, deleteStart) +
  "case 'delete-employee':{deleteEmployeeFromDatabase(id);break;}\n  " +
  s.slice(categoryStart);

replaceOnce(
  "window.addEventListener('ma-store-ready', function () {\n  if (window.MA_STORE && currentRole()) renderPage();\n});",
  "window.addEventListener('ma-store-ready', function () {\n  if (window.MA_STORE && currentRole()) {\n    if(currentRole()==='owner') loadEmployeesFromDatabase();\n    renderPage();\n  }\n});",
  'load employees after login'
);

const temp = path.join(process.cwd(), 'app-employees-check.tmp.js');
fs.writeFileSync(temp, s);
const {spawnSync} = require('node:child_process');
const check = spawnSync(process.execPath, ['--check', temp], {encoding:'utf8'});
fs.unlinkSync(temp);
if(check.status!==0)throw new Error('Syntax check failed: '+check.stderr);

const backupDir=path.join(process.cwd(),'.backups','employees-db-'+Date.now());
fs.mkdirSync(backupDir,{recursive:true});
fs.copyFileSync(file,path.join(backupDir,'app.js.bak'));
fs.writeFileSync(file,s,'utf8');
console.log('Employee database patch applied. Backup:',backupDir);
