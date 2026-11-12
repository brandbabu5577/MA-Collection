"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { errorMessage, inviteEmployee, normalizeInvite } = require("../frontend/js/employee-invitations.js");

const request = {
  store_id: "a2ce83c0-a57e-4ad2-b346-ef2796aa1b20",
  email: "  TeSt.Employee@Example.com ",
  full_name: "Test Employee",
  phone: "03001234567",
  role: "Manager",
};

test("invitation validates and sends a normalized store-scoped Edge Function request", async () => {
  let called;
  const client = { functions: { invoke: async (...args) => {
    called = args;
    return { data: { success: true, employee_id: "auth-user-id", role: "manager" }, error: null };
  } } };
  const result = await inviteEmployee(client, request);
  assert.equal(result.employee_id, "auth-user-id");
  assert.equal(called[0], "invite-employee");
  assert.deepEqual(called[1].body, {
    store_id: request.store_id,
    email: "test.employee@example.com",
    full_name: "Test Employee",
    phone: "03001234567",
    role: "manager",
  });
});

test("invalid store, email, name, phone and role are rejected before network invocation", async () => {
  let calls = 0;
  const client = { functions: { invoke: async () => { calls++; return { data: {}, error: null }; } } };
  for (const patch of [
    { store_id: "not-a-uuid" },
    { email: "bad-email" },
    { full_name: " " },
    { phone: "x".repeat(31) },
    { role: "owner" },
  ]) {
    assert.throws(() => normalizeInvite({ ...request, ...patch }));
    await assert.rejects(inviteEmployee(client, { ...request, ...patch }));
  }
  assert.equal(calls, 0);
});

test("duplicate invitation response is normalized to a safe conflict message", async () => {
  const client = {
    functions: {
      invoke: async () => ({
        data: null,
        error: {
          message: "Edge Function returned a non-2xx status code",
          context: new Response(
            JSON.stringify({ error: "This email already has an account or invitation." }),
            { status: 409, headers: { "content-type": "application/json" } },
          ),
        },
      }),
    },
  };
  await assert.rejects(inviteEmployee(client, request), error => {
    assert.equal(error.status, 409);
    assert.match(errorMessage(error), /already has an account or invitation/);
    return true;
  });
});

test("unauthorized owner check and server/network failures return user-safe feedback", async () => {
  const forbidden = {
    functions: {
      invoke: async () => ({
        data: null,
        error: { context: new Response(JSON.stringify({ error: "Only the store owner can invite employees." }), { status: 403 }) },
      }),
    },
  };
  await assert.rejects(inviteEmployee(forbidden, request), error => {
    assert.equal(error.status, 403);
    assert.match(errorMessage(error), /Only the owner/);
    return true;
  });

  const broken = { functions: { invoke: async () => { throw new Error("network details"); } } };
  await assert.rejects(inviteEmployee(broken, request), error => {
    assert.match(errorMessage(error), /Invitation failed/);
    return true;
  });

  const failed = { functions: { invoke: async () => ({
    data: null,
    error: { message: "Edge Function returned a non-2xx status code", context: new Response(
      JSON.stringify({ error: "Invitation could not be sent. Check the email address and try again." }),
      { status: 400 },
    ) },
  }) } };
  await assert.rejects(inviteEmployee(failed, request), error => {
    assert.equal(error.status, 400);
    assert.match(errorMessage(error), /Invitation could not be sent/);
    return true;
  });
});

test("invitation response must confirm a created employee before UI can report success", async () => {
  const client = { functions: { invoke: async () => ({ data: { success: true }, error: null }) } };
  await assert.rejects(inviteEmployee(client, request), /response was incomplete/);
});

test("linked employee removal invokes the owner-only function with the active store and employee", async () => {
  let call;
  const client = { functions: { invoke: async (...args) => {
    call = args;
    return { data: { success: true, access_revoked: true }, error: null };
  } } };
  const employeeId = "c7bf1be8-99c8-48a8-a446-b064a9b912ab";
  const result = await require("../frontend/js/employee-invitations.js").removeEmployee(client, {
    store_id: request.store_id,
    employee_id: employeeId,
  });
  assert.equal(call[0], "remove-employee");
  assert.deepEqual(call[1].body, { store_id: request.store_id, employee_id: employeeId });
  assert.equal(result.access_revoked, true);
});

test("employee removal rejects invalid IDs and presents authorization failures safely", async () => {
  const api = require("../frontend/js/employee-invitations.js");
  let calls = 0;
  const client = { functions: { invoke: async () => { calls++; return { data: {}, error: null }; } } };
  await assert.rejects(api.removeEmployee(client, { store_id: "bad", employee_id: "bad" }));
  assert.equal(calls, 0);

  const forbidden = { functions: { invoke: async () => ({
    data: null,
    error: { context: new Response(JSON.stringify({ error: "Only the store owner can remove employee access." }), { status: 403 }) },
  }) } };
  await assert.rejects(api.removeEmployee(forbidden, {
    store_id: request.store_id,
    employee_id: "c7bf1be8-99c8-48a8-a446-b064a9b912ab",
  }), error => {
    assert.equal(error.status, 403);
    assert.match(api.errorMessage(error), /Only the owner/);
    return true;
  });
});
