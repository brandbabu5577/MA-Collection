(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MAEmployeeInvitations = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STORE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function normalizeInvite(input) {
    const storeId = String(input?.store_id ?? '').trim();
    const email = String(input?.email ?? '').trim().toLowerCase();
    const fullName = String(input?.full_name ?? '').trim();
    const phone = String(input?.phone ?? '').trim();
    const role = String(input?.role ?? '').trim().toLowerCase();
    if (!STORE_ID.test(storeId)) throw new Error('Select a valid store before inviting an employee.');
    if (email.length > 254 || !EMAIL.test(email)) throw new Error('Enter a valid email address.');
    if (!fullName || fullName.length > 120) throw new Error('Employee name must be between 1 and 120 characters.');
    if (phone.length > 30) throw new Error('Phone number must be 30 characters or fewer.');
    if (!['manager', 'cashier'].includes(role)) throw new Error('Employee role must be Manager or Cashier.');
    return { store_id: storeId, email, full_name: fullName, phone: phone || null, role };
  }

  async function inviteEmployee(client, input) {
    if (!client?.functions || typeof client.functions.invoke !== 'function') {
      throw new Error('Invitation service is unavailable. Check the Supabase connection.');
    }
    const body = normalizeInvite(input);
    const { data, error } = await client.functions.invoke('invite-employee', { body });
    if (error) {
      let message = error.message || 'Invitation request failed.';
      let status = error.context?.status;
      if (error.context && typeof error.context.json === 'function') {
        try {
          const details = await error.context.json();
          if (details?.error) message = details.error;
          if (details?.status) status = details.status;
        } catch (_) { /* Keep the SDK error when no JSON response is available. */ }
      }
      const failure = new Error(message);
      failure.status = status;
      failure.code = error.code;
      throw failure;
    }
    if (!data?.success || !data?.employee_id) throw new Error('Invitation response was incomplete. Refresh the employee list before retrying.');
    return data;
  }

  async function removeEmployee(client, input) {
    if (!client?.functions || typeof client.functions.invoke !== 'function') {
      throw new Error('Employee access service is unavailable. Check the Supabase connection.');
    }
    const storeId = String(input?.store_id ?? '').trim();
    const employeeId = String(input?.employee_id ?? '').trim();
    if (!STORE_ID.test(storeId) || !STORE_ID.test(employeeId)) throw new Error('Select a valid employee in the active store.');
    const { data, error } = await client.functions.invoke('remove-employee', { body: { store_id: storeId, employee_id: employeeId } });
    if (error) {
      let message = error.message || 'Employee access could not be removed.';
      let status = error.context?.status;
      if (error.context && typeof error.context.json === 'function') {
        try {
          const details = await error.context.json();
          if (details?.error) message = details.error;
          if (details?.status) status = details.status;
        } catch (_) { /* Keep the SDK error when no JSON response is available. */ }
      }
      const failure = new Error(message);
      failure.status = status;
      throw failure;
    }
    if (!data?.success) throw new Error('Employee removal response was incomplete. Refresh the directory.');
    return data;
  }

  function errorMessage(error, operation = 'invite') {
    if (error?.status === 409) return operation === 'remove'
      ? 'This employee cannot be removed from this store. Confirm their role and linked account.'
      : 'This email already has an account or invitation. Check the employee list or use another email.';
    if (error?.status === 401) return 'Your session has expired. Sign in again to invite an employee.';
    if (error?.status === 403) return 'Only the owner of this store can invite employees.';
    if (error?.status === 400) return error.message || 'Check the employee name, email and role.';
    if (error?.status === 404) return 'Employee record was not found in the active store.';
    return 'Invitation failed. Check the connection and try again.';
  }

  return Object.freeze({ normalizeInvite, inviteEmployee, removeEmployee, errorMessage });
});
