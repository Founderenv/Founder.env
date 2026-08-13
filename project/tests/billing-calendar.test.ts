import assert from 'node:assert/strict';
import test from 'node:test';
import { addOneCalendarMonth, MONTHLY_FEE_PAISE, SETUP_FEE_PAISE, TOTAL_COUNT } from '../supabase/functions/_shared/billing.ts';

test('Razorpay billing contract uses paise and 24 monthly charges', () => {
  assert.equal(SETUP_FEE_PAISE, 29_900);
  assert.equal(MONTHLY_FEE_PAISE, 19_900);
  assert.equal(TOTAL_COUNT, 24);
});

test('first charge starts one calendar month later at the same UTC time', () => {
  assert.equal(addOneCalendarMonth(new Date('2026-08-14T12:34:56Z')).toISOString(), '2026-09-14T12:34:56.000Z');
});

test('end-of-month dates clamp without using a 30-day approximation', () => {
  assert.equal(addOneCalendarMonth(new Date('2027-01-31T10:00:00Z')).toISOString(), '2027-02-28T10:00:00.000Z');
  assert.equal(addOneCalendarMonth(new Date('2028-01-31T10:00:00Z')).toISOString(), '2028-02-29T10:00:00.000Z');
  assert.equal(addOneCalendarMonth(new Date('2026-12-31T23:59:59Z')).toISOString(), '2027-01-31T23:59:59.000Z');
});
