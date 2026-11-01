// Review exact import/export normalization without weakening the raw diff guard.
const fs=require('fs'),{inspect,changes}=require('./check-flow-change.cjs');
const own=(o,k)=>o&&Object.hasOwn(o,k),empty=o=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===0;
function get(o,p){return p.split('/').slice(1).reduce((v,k)=>v?.[k.replaceAll('~1','/').replaceAll('~0','~')],o);}
function classify(before,after,c){
 const parent=c.path.slice(0,c.path.lastIndexOf('/')),a=get(before,parent),b=get(after,parent);
 const action=c.path.includes('/actions/')&&typeof a?.type==='string'&&a.type===b?.type;
 if(action&&c.path.endsWith('/runAfter')&&c.kind==='add'&&!own(a,'runAfter')&&empty(b.runAfter))return 'explicit empty root dependency';
 if(action&&c.path.endsWith('/else')&&c.kind==='remove'&&Object.keys(a.else||{}).length===1&&empty(a.else.actions)&&!own(b,'else'))return 'removed empty else branch';
 if(action&&c.path.endsWith('/metadata')&&c.kind==='add'&&!own(a,'metadata')&&Object.keys(b.metadata||{}).length===1&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(b.metadata.operationMetadataId||''))return 'designer operation identifier';
 if(['/properties/definition/metadata/clientLastModifiedTime','/properties/definition/metadata/connectionKeySavedTimeKey'].includes(c.path)&&c.kind==='replace'&&typeof get(before,c.path)==='string'&&typeof get(after,c.path)==='string'&&Number.isFinite(Date.parse(get(after,c.path))))return 'export timestamp';
 return null;
}
function review(before,after){
 const diff=changes(before,after),approved=[],unexpected=[],categories={};
 for(const c of diff){const category=classify(before,after,c);if(category){approved.push(c);categories[category]=(categories[category]||0)+1;}else unexpected.push(c);}
 const raw=inspect(before,after,approved);
 return {result:raw.result,beforeHash:raw.beforeHash,afterHash:raw.afterHash,changeCount:diff.length,categories,unexpected,approvedExactFingerprints:approved,scope:'Only narrowly checked platform representation changes. All executable fields, triggers, connections, authorization and notification logic remain covered by the exact guard.'};
}
module.exports={review};
if(require.main===module){try{const[a,b,out]=process.argv.slice(2);const report=review(JSON.parse(fs.readFileSync(a)),JSON.parse(fs.readFileSync(b)));if(out)fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({result:report.result,changeCount:report.changeCount,categories:report.categories,unexpectedCount:report.unexpected.length,unexpected:report.unexpected}));process.exitCode=report.result==='PASS'?0:1;}catch{console.error('Deployed flow comparison failed; source values are not logged.');process.exitCode=2;}}
