import test from 'node:test';
import assert from 'node:assert/strict';
import { navigationSections, navigationTrail, filterNavigation } from '../src/react/components/navigation.js';

const menu = [
  { to: '/', label: 'Dashboard' },
  { id: 'commerce', label: 'Commerce', children: [
    { to: '/orders', label: 'Orders' },
    { id: 'reports', label: 'Reports', children: [
      { to: '/orders/reports', label: 'Sales report', keywords: ['revenue'] },
    ] },
    { to: '/orders/:id', label: 'Order detail', end: true },
  ] },
  { id: 'admin', label: 'Administration', section: 'platform', children: [
    { to: '/users', label: 'Users' },
  ] },
];

test('Ungrouped and legacy app links precede platform controls even with matching captions', () => {
  const sections = navigationSections([menu[2], ...menu.slice(0, 2), { to: '/stock', label: 'Stock', group: 'Administration' }]);
  assert.deepEqual(sections.map(s => [s.label, s.platform]), [['Workspace', false], ['Administration', false], ['', true]]);
  assert.equal(sections[0].items[0].label, 'Dashboard');
  const originalKey = sections[0].items[1].children[0].key;
  assert.equal(navigationSections([{ to: '/new', label: 'New' }, ...menu])[0].items[2].children[0].key, originalKey);
});

test('Deep routes reveal their full module trail and choose static routes over dynamic or parent links', () => {
  assert.deepEqual(navigationTrail('/orders/reports', menu).map(i => i.label), ['Commerce', 'Reports', 'Sales report']);
  assert.deepEqual(navigationTrail('/orders/123', menu).map(i => i.label), ['Commerce', 'Order detail']);
  assert.deepEqual(navigationTrail('/orders/123/history', menu).map(i => i.label), ['Commerce', 'Orders']);
  assert.deepEqual(navigationTrail('/orders-archive', menu), []);
  assert.equal(navigationTrail('/', menu).at(-1).label, 'Dashboard');
});

test('Search finds nested pages by module and keyword without changing saved tree structure', () => {
  const matches = filterNavigation(menu, 'COMMERCE revenue');
  assert.equal(matches.length, 1);
  assert.equal(matches[0].children.length, 1);
  assert.equal(matches[0].children[0].children[0].to, '/orders/reports');
  assert.equal(menu[1].children.length, 3);
  assert.equal(filterNavigation(menu, 'commerce')[0].children.length, 3);
  assert.deepEqual(filterNavigation(menu, 'no-such-page'), []);
});
