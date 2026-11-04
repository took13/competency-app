// Real endpoint, deliberately invalid session only. No owner credentials.
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const {url}=JSON.parse(fs.readFileSync('test-results/executive-private/official-test-endpoint.json'));
 const cases=[['preview_official_test_assignment',401,{}],['create_official_test_assignment',401,{}],['create_official_assignment',501,{}],['create_pilot_assignment',400,{}],['preview_official_test_assignment',400,{role:'ADMIN'}],['create_official_test_assignment',400,{reviewerEmail:'unauthorized@example.test'}]];
 const results=await Promise.all(cases.map(async([action,expected,extra])=>{
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,sessionToken:'invalid-negative-probe',cycleKey:'ETM_OFFICIAL_TEST_20261103_01',employeeEmail:'watchara.p@gpscgroup.com',...extra}),signal:AbortSignal.timeout(110000)});
  const body=await response.json();assert.equal(response.status,expected);assert(!body.assessment&&!body.items&&!body.reviews);
  return {action,status:response.status,expected,pass:true,keys:Object.keys(body)};
 }));
 const report={at:new Date().toISOString(),liveEndpoint:true,authenticated:false,pass:true,results};fs.writeFileSync('test-results/executive-private/official-test-final-live-negative.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(()=>{console.error('Negative probe failed; inspect private evidence without exposing endpoint.');process.exitCode=1;});
