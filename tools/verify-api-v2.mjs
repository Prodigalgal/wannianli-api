import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { contract, openApi, semanticResult } from "../worker/src/semantic.js";
import { calculateCurrentAlmanac } from "../worker/src/engine.js";

const base=process.argv[2];
if(!base)throw new Error("Usage: node tools/verify-api-v2.mjs <base-url> [report-file]");
const checks=[];
const normalize=value=>Array.isArray(value)?value.map(normalize):value&&typeof value==="object"
  ?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,normalize(v)]))
  :typeof value==="string"&&/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/u.test(value)?new Date(value).toISOString():value;
async function check(name,path,init,status,verify){
  const response=await fetch(new URL(path,base),{...init,signal:AbortSignal.timeout(25000)});
  assert.equal(response.status,status,name);
  assert.equal(response.headers.get("cache-control"),"no-store",name);
  assert.equal(response.headers.get("x-content-type-options"),"nosniff",name);
  const text=await response.text();
  if(verify)verify(text?JSON.parse(text):null,response);
  checks.push({name,status:response.status});
  await new Promise(resolve=>setTimeout(resolve,700));
}
const post=body=>({method:"POST",headers:{"content-type":"application/json"},body:typeof body==="string"?body:JSON.stringify(body)});
const rpc=(body,extra={})=>({...post(body),headers:{"content-type":"application/json",accept:"application/json, text/event-stream",...extra}});
const meta={"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientCapabilities":{}};
const protocolHeaders=method=>({"mcp-protocol-version":"2026-07-28","mcp-method":method});
await check("capabilities","/api/v2/almanac/capabilities",{},200,v=>assert.deepEqual(v,contract.capabilities));
await check("OpenAPI","/api/v2/almanac/openapi.json",{},200,v=>assert.deepEqual(v,openApi()));
await check("Gregorian query","/api/v2/almanac?date=2026-08-03&time=12:30:15",{},200,v=>assert.deepEqual(normalize(v),normalize(semanticResult(calculateCurrentAlmanac(new Date("2026-08-03T04:30:15Z"))))));
await check("lunar leap month","/api/v2/almanac",post({calendar:"lunar",date:"2020-04-01",time:"23:59:59",leapMonth:true}),200,v=>{assert.equal(v.gregorian.date,"2020-05-23");assert.equal(v.lunar.leapMonth,true);});
await check("default midnight","/api/v2/almanac?date=2026-08-03",{},200,v=>assert.equal(Date.parse(v.dateTime),Date.parse("2026-08-03T00:00:00+08:00")));
await check("1979 major cold corrected across midnight","/api/v2/almanac?date=1979-01-20&time=23:59:59",{},200,v=>{
  assert.equal(v.solarTerm.previous.name,"大寒");
  assert.equal(new Date(Date.parse(v.solarTerm.previous.at)+28800000).toISOString().slice(0,10),"1979-01-20");
});
await check("no salary restricted annotation","/api/v2/almanac?date=2024-01-18&time=12:00:00",{},200,v=>{
  const allowed=contract.capabilities.annotationPolicies.noSalary.allowedActivities;
  for (const list of [v.activities.recommended,v.activities.avoided,v.activities.caution]) assert.ok(list.every(a=>allowed.includes(a)));
  assert.ok(!v.activities.avoided.includes("远行"));
});
await check("now with scope and grade code","/api/v2/almanac/now",{},200,v=>{assert.equal(v.schemaVersion,"2.0");assert.deepEqual(v.scope,contract.resultScope);assert.equal(typeof v.activities.virtuePresent,"boolean");assert.equal(contract.capabilities.dayGrades[v.activities.dayGradeCode],v.activities.dayGrade);});
for(const [name,body]of[["invalid day",{date:"2026-02-30"}],["invalid leap flag",{date:"2026-08-03",leapMonth:"true"}],["duplicate JSON",'{"date":"2026-08-03","date":"2024-01-01"}']]){
  await check(name,"/api/v2/almanac",post(body),400,v=>assert.equal(v.error.code,"INVALID_REQUEST"));
}
await check("duplicate query","/api/v2/almanac?date=2026-08-03&date=2024-01-01",{},400,v=>assert.equal(v.error.code,"INVALID_REQUEST"));
await check("v2 body limit","/api/v2/almanac",post(" ".repeat(1025)),413,v=>assert.equal(v.error.code,"PAYLOAD_TOO_LARGE"));
await check("HEAD","/api/v2/almanac/now",{method:"HEAD"},200,v=>assert.equal(v,null));
await check("HEAD calculation","/api/v2/almanac?date=2026-08-03",{method:"HEAD"},200,v=>assert.equal(v,null));
await check("range leap boundary","/api/v2/almanac/range?startDate=2020-05-22&endDate=2020-05-23&time=23:59:59",{},200,v=>{assert.equal(v.range.quotaUnits,2);assert.equal(v.results.length,2);assert.equal(v.results[1].lunar.leapMonth,true);});
await check("14-day range","/api/v2/almanac/range?startDate=2026-10-01&endDate=2026-10-14",{},200,v=>{assert.equal(v.range.quotaUnits,14);assert.equal(v.results.length,14);});
await check("range maximum enforced","/api/v2/almanac/range?startDate=2020-01-01&endDate=2020-01-15",{},400,v=>assert.equal(v.error.code,"INVALID_REQUEST"));
await check("range reverse rejected","/api/v2/almanac/range",post({startDate:"2020-01-02",endDate:"2020-01-01"}),400,v=>assert.equal(v.error.code,"INVALID_REQUEST"));
await check("range HEAD","/api/v2/almanac/range?startDate=2020-01-01&endDate=2020-01-14",{method:"HEAD"},200,v=>assert.equal(v,null));
await check("legacy initialize","/mcp",rpc({jsonrpc:"2.0",id:1,method:"initialize",params:{protocolVersion:"2025-11-25",capabilities:{},clientInfo:{name:"deployment-check",version:"1"}}}),200,v=>assert.equal(v.result.protocolVersion,"2025-11-25"));
await check("initialized notification","/mcp",rpc({jsonrpc:"2.0",method:"notifications/initialized"}),202,v=>assert.equal(v,null));
await check("tools schema","/mcp",rpc({jsonrpc:"2.0",id:2,method:"tools/list"},{"mcp-protocol-version":"2025-11-25"}),200,v=>assert.deepEqual(v.result.tools,contract.tools));
await check("modern discover","/mcp",rpc({jsonrpc:"2.0",id:3,method:"server/discover",params:{_meta:meta}},protocolHeaders("server/discover")),200,v=>{assert.equal(v.result.resultType,"complete");assert.deepEqual(v.result.supportedVersions,contract.protocolVersions);});
await check("modern tool calculation","/mcp",rpc({jsonrpc:"2.0",id:4,method:"tools/call",params:{name:"calculate_almanac",arguments:{date:"2026-08-03"},_meta:meta}},
  {...protocolHeaders("tools/call"),"mcp-name":"calculate_almanac"}),200,v=>{assert.equal(v.result.resultType,"complete");assert.equal(v.result.structuredContent.gregorian.date,"2026-08-03");});
await check("Origin on GET","/mcp",{headers:{origin:"https://attacker.invalid"}},403,v=>assert.ok(v.error));
await check("metadata mismatch","/mcp",rpc({jsonrpc:"2.0",id:5,method:"ping",params:{_meta:meta}},protocolHeaders("tools/list")),400,v=>assert.equal(v.error.code,-32020));
await check("unsupported protocol","/mcp",rpc({jsonrpc:"2.0",id:6,method:"ping"},{"mcp-protocol-version":"2099-01-01"}),400,v=>assert.equal(v.error.code,-32022));
await check("MCP body limit","/mcp",rpc(" ".repeat(16385)),413,v=>assert.ok(v.error));
await check("v1 placement correction","/api/v1/almanac/calculate",post({历法:"公历",年:2024,月:1,日:30,时:12}),200,v=>{assert.ok(v.宜忌.忌.includes("远行"));assert.ok(!v.宜忌.宜.includes("遣使"));});
await check("open day burial placement","/api/v1/almanac/calculate",post({历法:"公历",年:2020,月:2,日:2,时:12}),200,v=>{for(const name of ["破土","安葬","启攒"])assert.ok(!v.宜忌.宜.includes(name));for(const name of ["安葬","启攒"])assert.ok(!v.宜忌.忌.includes(name));assert.ok(v.宜忌.忌.includes("破土"));});
const report={base,checkedAt:new Date().toISOString(),passed:checks.length,checks};
if(process.argv[3]){await mkdir(dirname(process.argv[3]),{recursive:true});await writeFile(process.argv[3],JSON.stringify(report,null,2)+"\n");}
console.log(JSON.stringify(report));
