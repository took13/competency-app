const assert = require('node:assert/strict');
const {inspect, changes} = require('./tools/check-flow-change.cjs');
const baseline = {
  properties: {
    connectionReferences: {mail: 'existing'},
    definition: {
      triggers: {manual: {type: 'Request', inputs: {schema: {type: 'object'}}}},
      actions: {
        Authorize: {type: 'If', expression: 'reviewer/admin', actions: {}},
        Submit: {type: 'Response', inputs: {statusCode: 200}},
        Notify: {type: 'If', actions: {
          Claim: {type: 'OpenApiConnection', inputs: {key: 'event|record|recipient'}},
          Send: {runAfter: {Claim: ['Succeeded']}, inputs: {recipient: 'backend', retryPolicy: {type: 'none'}}}
        }}
      }
    }
  }
};
const copy = () => structuredClone(baseline);
assert.equal(inspect(baseline, copy()).result, 'PASS');
for (const mutate of [
  d => d.properties.definition.actions.Authorize.expression = 'true',
  d => d.properties.definition.triggers.manual.inputs.schema.type = 'string',
  d => d.properties.connectionReferences.mail = 'new-connection',
  d => delete d.properties.definition.actions.Notify,
  d => d.properties.definition.actions.Notify.actions.Send.inputs.recipient = 'client',
  d => d.properties.definition.actions.Notify.actions.Send.inputs.retryPolicy.type = 'exponential',
  d => d.properties.definition.actions.Notify.actions.Send.runAfter.Claim = ['Failed'],
  d => d.properties.definition.actions.Submit.inputs.statusCode = 201
]) { const candidate = copy(); mutate(candidate); assert.equal(inspect(baseline, candidate).result, 'FAIL'); }
const candidate = copy(); candidate.properties.definition.actions.Return = {type:'If',expression:'guarded'};
const policy = changes(baseline, candidate);
assert.equal(inspect(baseline, candidate, policy).result, 'PASS');
candidate.properties.definition.actions.Return.expression = 'unguarded';
assert.equal(inspect(baseline, candidate, policy).result, 'FAIL', 'same path with different code must fail');
assert.equal(inspect(baseline, baseline, policy).result, 'FAIL', 'unused approval must fail');
assert.throws(() => inspect(baseline, baseline, [...policy,...policy]));
const reordered = {properties:{definition:baseline.properties.definition,connectionReferences:{mail:'existing'}}};
assert.equal(inspect(baseline, reordered).result, 'PASS');
assert(!JSON.stringify(inspect(baseline, candidate)).includes('unguarded'));
console.log('PASS flow guard: auth, triggers, connections, responses, notifications, claim dependencies, retries, exact fingerprints, unused approvals, safe output');
