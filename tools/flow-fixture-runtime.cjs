// Small offline test interpreter for this repository's WDL subset.
// This is NOT the Microsoft engine or connector validation.
const clone=x=>structuredClone(x);
function value(source,ctx){
 if(Array.isArray(source))return source.map(x=>value(x,ctx));
 if(source&&typeof source==='object')return Object.fromEntries(Object.entries(source).map(([k,v])=>[k,value(v,ctx)]));
 if(typeof source!=='string')return source;
 if(!source.startsWith('@'))return source.replace(/@\{([^}]+)\}/g,(_,x)=>String(expression(x,ctx)??''));
 if(source.startsWith('@{'))return source.replace(/@\{([^}]+)\}/g,(_,x)=>String(expression(x,ctx)??''));
 return expression(source.slice(1),ctx);
}
function expression(text,ctx){
 let i=0;
 const skip=()=>{while(/\s/.test(text[i]||'')&&i<text.length)i++;};
 const str=()=>{i++;let out='';while(i<text.length){if(text[i]==="'"){if(text[i+1]==="'"){out+="'";i+=2;}else{i++;return out;}}else out+=text[i++];}throw Error('Unclosed expression string');};
 function parse(){skip();let result;
  if(text[i]==="'")result=str();else if(/[-0-9]/.test(text[i]||'')){let start=i++;while(/[.0-9]/.test(text[i]||'')&&i<text.length)i++;result=Number(text.slice(start,i));}
  else{const m=/^[A-Za-z_][A-Za-z0-9_]*/.exec(text.slice(i));if(!m)throw Error('Expression token near '+text.slice(i,i+25));i+=m[0].length;const name=m[0];skip();
   if(text[i]==='('){i++;const args=[];skip();while(text[i]!==')'){args.push(parse());skip();if(text[i]===','){i++;continue;}if(text[i]!==')')throw Error('Expression separator');}i++;result=call(name,args,ctx);}
   else if(name==='true'||name==='false'||name==='null')result={true:true,false:false,null:null}[name];else throw Error('Unsupported literal '+name);
  }
  skip();while(text[i]==='?'||text[i]==='['){if(text[i]==='?')i++;if(text[i++]!=='[')throw Error('Expected property');skip();const key=str();skip();if(text[i++]!==']')throw Error('Property end');if(result==null)result=null;else if(Object.hasOwn(result,key))result=result[key];else result=key.split('/').reduce((x,k)=>x?.[k]??null,result);skip();}return result;
 }
 const result=parse();skip();if(i!==text.length)throw Error('Trailing expression '+text.slice(i));return result;
}
function call(n,a,c){const f={
 outputs:()=>c.outputs[a[0]],body:()=>c.outputs[a[0]]?.body??null,triggerBody:()=>c.request,
 item:()=>c.item,items:()=>c.items?.[a[0]],workflow:()=>({run:{name:c.runId}}),parameters:()=>null,
 equals:()=>a[0]===a[1],not:()=>!a[0],and:()=>a.every(Boolean),or:()=>a.some(Boolean),if:()=>a[0]?a[1]:a[2],
 greater:()=>a[0]>a[1],greaterOrEquals:()=>a[0]>=a[1],less:()=>a[0]<a[1],lessOrEquals:()=>a[0]<=a[1],
 int:()=>{const n=Number(a[0]);if(!Number.isInteger(n))throw Error('Invalid int');return n;},float:()=>Number(a[0]),
 length:()=>a[0]?.length??0,empty:()=>a[0]==null||a[0]===''||Array.isArray(a[0])&&a[0].length===0,
 coalesce:()=>a.find(x=>x!==null&&x!==undefined)??null,first:()=>a[0]?.[0]??null,
 concat:()=>a.join(''),string:()=>typeof a[0]==='object'?JSON.stringify(a[0]):String(a[0]??''),json:()=>JSON.parse(a[0]),
 trim:()=>String(a[0]??'').trim(),toLower:()=>String(a[0]??'').toLowerCase(),replace:()=>String(a[0]).split(a[1]).join(a[2]),
 createArray:()=>a,array:()=>Array.isArray(a[0])?a[0]:[a[0]],union:()=>[...new Map(a.flat().map(v=>[JSON.stringify(v),v])).values()],
 sub:()=>Number(a[0])-Number(a[1]),add:()=>Number(a[0])+Number(a[1]),contains:()=>a[0]&&typeof a[0]==='object'&&!Array.isArray(a[0])?Object.hasOwn(a[0],a[1]):a[0]?.includes(a[1])??false,
 utcNow:()=>new Date().toISOString(),ticks:()=>Date.parse(a[0])*10000
 };if(!f[n])throw Error('Unimplemented WDL function '+n);return f[n]();}
function condition(x,c){if(typeof x==='string')return value(x,c);const[k,v]=Object.entries(x)[0];return call(k,Array.isArray(v)?v.map(a=>typeof a==='object'&&!Array.isArray(a)?condition(a,c):value(a,c)):[condition(v,c)],c);}
class Halt extends Error{}
async function run(definition,request,connector,runId='fixture-run'){
 const c={request,runId,outputs:{},statuses:{},errors:[],response:null,item:null,items:{}};
 async function group(actions){const todo=new Set(Object.keys(actions));let anyFailed=false;
  while(todo.size){let moved=false;for(const name of [...todo]){const node=actions[name],deps=node.runAfter||{};if(Object.keys(deps).some(d=>!c.statuses[d]))continue;todo.delete(name);moved=true;
    if(Object.entries(deps).some(([d,states])=>!states.includes(c.statuses[d]))){c.statuses[name]='Skipped';continue;}
    try{let result;switch(node.type){
     case 'Compose':result=value(node.inputs,c);break;
     case 'If':{const ok=condition(node.expression,c);const failed=await group(ok?node.actions:node.else?.actions||{});if(failed)throw Error('Child failed');break;}
     case 'Query':result={body:value(node.inputs.from,c).filter(item=>value(node.inputs.where,{...c,item}))};break;
     case 'Select':result={body:value(node.inputs.from,c).map(item=>value(node.inputs.select,{...c,item}))};break;
     case 'Foreach':for(const item of value(node.foreach,c)){const prev=c.item;c.item=item;c.items[name]=item;if(await group(node.actions))throw Error('Loop child failed');c.item=prev;}break;
     case 'OpenApiConnection':result=await connector(name,node.inputs.host.operationId,value(node.inputs.parameters,c),c);break;
     case 'Response':c.response=value(node.inputs,c);break;
     case 'Terminate':throw new Halt();
     default:throw Error('Unsupported action type '+node.type);
    }c.outputs[name]=result;c.statuses[name]='Succeeded';
    }catch(e){if(e instanceof Halt)throw e;c.statuses[name]='Failed';c.errors.push({name,message:e.message});anyFailed=true;}
  }if(!moved)throw Error('Unresolved action dependency: '+[...todo].join(','));}return anyFailed;
 }
 try{await group(definition.properties.definition.actions);}catch(e){if(!(e instanceof Halt))throw e;}return c;
}
function fixtureConnector(tables,options={}){
 const mails=[];let ids=100;const versions=new Map();
 const version=(t,id)=>versions.get(t+'|'+id)||1;
 function update(t,id,patch){const row=tables[t].find(x=>x.ID===id);if(!row)throw Error('Missing fixture row');Object.assign(row,clone(patch));versions.set(t+'|'+id,version(t,id)+1);return row;}
 function matches(row,filter){if(!filter)return true;return [...filter.matchAll(/(\w+) eq '((?:[^']|'')*)'/g)].every(([,k,v])=>{const actual=row[k]?.Value??row[k];return String(actual??'')===v.replaceAll("''","'");});}
 async function connector(name,op,p,c){
  if(options.fail===name)throw Error('Injected connector failure');
  if(op==='SendEmailV2'){mails.push(p);return {statusCode:200,body:{}};}
  if(op==='HttpRequest'){
   const m=/lists\(guid'([^']+)'\)\/items\((\d+)\)/.exec(p['parameters/uri']);if(!m)throw Error('Unexpected REST URI');const[,t,idText]=m,id=Number(idText),row=tables[t].find(r=>r.ID===id);if(!row)throw Error('Missing fixture item');
   if(p['parameters/method']==='GET'){const flat=Object.fromEntries(Object.entries(clone(row)).map(([k,v])=>[k,v?.Value??v]));return {statusCode:200,body:{d:{...flat,__metadata:{etag:'"'+version(t,id)+'"'}}}};}
   if(p['parameters/headers']['IF-MATCH']!=='"'+version(t,id)+'"')throw Error('412 fixture conflict');
   update(t,id,JSON.parse(p['parameters/body']));return {statusCode:204,body:{}};
  }
  const t=p.table;if(!tables[t])throw Error('Unknown fixture table '+t);
  if(op==='GetItems')return {statusCode:200,body:{value:clone(tables[t].filter(r=>matches(r,p.$filter)).slice(0,p.$top||5000))}};
  const patch={};for(const[k,v]of Object.entries(p)){if(k.startsWith('item/')){const parts=k.slice(5).split('/');patch[parts[0]]=parts[1]==='Value'?{Value:v}:v;}}
  if(op==='PatchItem')return {statusCode:200,body:clone(update(t,Number(p.id),patch))};
  if(op==='PostItem'){if(patch.EventKey&&tables[t].some(r=>r.EventKey===patch.EventKey))throw Error('Unique key conflict');const row={ID:ids++,...patch};tables[t].push(row);return {statusCode:201,body:clone(row)};}
  throw Error('Unimplemented connector '+op);
 }
 return {connector,mails,tables,versions};
}
module.exports={run,fixtureConnector,value,condition};
