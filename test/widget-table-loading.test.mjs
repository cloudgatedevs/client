import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { create, act } from "react-test-renderer";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const compiled = await build({
  entryPoints: [
    fileURLToPath(
      new URL("../src/react/widgets/DataTable.jsx", import.meta.url),
    ),
  ],
  bundle: true,
  write: false,
  format: "cjs",
  platform: "node",
  packages: "external",
  jsx: "automatic",
  logLevel: "silent",
});
const module = { exports: {} };
new Function("require", "module", "exports", compiled.outputFiles[0].text)(
  createRequire(import.meta.url),
  module,
  module.exports,
);
const { DataTable } = module.exports;
const columns = [{ key: "name", label: "Name" }];
const tableText = (view) => JSON.stringify(view.toJSON());
function controlledLoader() {
  const calls = [];
  const loadRows = (query) =>
    new Promise((resolve, reject) => calls.push({ query, resolve, reject }));
  return { calls, loadRows };
}
const click = async (view, label) =>
  act(async () =>
    view.root
      .find(
        (node) => node.type === "button" && node.props["aria-label"] === label,
      )
      .props.onClick(),
  );

test("remote table aborts superseded requests and ignores a stale result even when the loader ignores abort", async () => {
  const { calls, loadRows } = controlledLoader();
  let view;
  const render = (filters) =>
    React.createElement(DataTable, {
      columns,
      loadRows,
      filters,
      debounceMs: 0,
    });
  await act(async () => {
    view = create(render({ status: "old" }));
  });
  assert.equal(calls.length, 1);
  await act(async () => view.update(render({ status: "new" })));
  assert.equal(calls[0].query.signal.aborted, true);
  await act(async () =>
    calls[1].resolve({ rows: [{ id: 2, name: "New result" }], total: 1 }),
  );
  await act(async () =>
    calls[0].resolve({ rows: [{ id: 1, name: "Stale result" }], total: 1 }),
  );
  assert.match(tableText(view), /New result/);
  assert.doesNotMatch(tableText(view), /Stale result/);
  await act(async () => view.unmount());
  assert.equal(calls[1].query.signal.aborted, true);
});

test("remote table keeps requests page-sized and merges incremental pages without duplicates", async () => {
  const { calls, loadRows } = controlledLoader();
  let view;
  await act(async () => {
    view = create(
      React.createElement(DataTable, {
        columns,
        loadRows,
        pageSize: 2,
        pagination: "load-more",
      }),
    );
  });
  await act(async () =>
    calls[0].resolve({
      rows: [
        { id: 1, name: "First" },
        { id: 2, name: "Second" },
      ],
      total: 5,
    }),
  );
  await act(async () =>
    view.root
      .find(
        (node) => node.type === "button" && node.children.includes("Load more"),
      )
      .props.onClick(),
  );
  assert.equal(calls[1].query.page, 2);
  assert.equal(calls[1].query.pageSize, 2);
  await act(async () =>
    calls[1].resolve({
      rows: [
        { id: 2, name: "Updated second" },
        { id: 3, name: "Third" },
      ],
      total: 5,
    }),
  );
  const cells = view.root
    .findAllByType("td")
    .map((cell) => cell.children.join(" "));
  assert.deepEqual(cells, ["First", "Updated second", "Third"]);
  await act(async () => view.unmount());
});

test("remote filters reset to page 1, refresh retries errors, and debounced search reaches the loader", async () => {
  const { calls, loadRows } = controlledLoader();
  let view;
  const render = (filters) =>
    React.createElement(DataTable, {
      columns,
      loadRows,
      filters,
      pageSize: 2,
      debounceMs: 5,
    });
  await act(async () => {
    view = create(render({ status: "" }));
  });
  await act(async () =>
    calls[0].resolve({
      rows: [
        { id: 1, name: "First" },
        { id: 2, name: "Second" },
      ],
      total: 8,
    }),
  );
  await click(view, "Next page");
  assert.equal(calls[1].query.page, 2);
  await act(async () =>
    calls[1].resolve({ rows: [{ id: 3, name: "Third" }], total: 8 }),
  );
  await act(async () => view.update(render({ status: "Active" })));
  assert.equal(calls[2].query.page, 1);
  assert.equal(calls[2].query.filters.status, "Active");
  await act(async () =>
    calls[2].reject(new Error("Temporary service failure")),
  );
  assert.match(tableText(view), /Temporary service failure/);
  await act(async () =>
    view.root
      .find(
        (node) => node.type === "button" && node.children.includes("Try again"),
      )
      .props.onClick(),
  );
  await act(async () => calls[3].resolve({ rows: [], total: 0 }));
  assert.match(tableText(view), /No records found/);
  await act(async () => {
    view.root
      .findAllByType("input")
      .find((node) => node.props.type === "search")
      .props.onChange({ target: { value: "latest" } });
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  assert.equal(calls.at(-1).query.search, "latest");
  assert.equal(calls.at(-1).query.page, 1);
  await act(async () => view.unmount());
});
