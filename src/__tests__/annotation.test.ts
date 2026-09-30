import { annotate, initialAnnotation, penPath, arrowHead, rectBetween, type AnnotationState } from "../sheet/annotation";

const run = (actions: Parameters<typeof annotate>[1][], s: AnnotationState = initialAnnotation) => actions.reduce(annotate, s);

test("pen strokes collect points and commit on end", () => {
  const s = run([
    { type: "start", tool: "pen", color: "#f00", point: { x: 1, y: 1 } },
    { type: "move", point: { x: 5, y: 5 } },
    { type: "move", point: { x: 9, y: 2 } },
    { type: "end" },
  ]);
  expect(s.draft).toBeNull();
  expect(s.shapes).toEqual([{ kind: "pen", color: "#f00", points: [{ x: 1, y: 1 }, { x: 5, y: 5 }, { x: 9, y: 2 }] }]);
});

test("arrow and redact keep start and latest point", () => {
  const s = run([
    { type: "start", tool: "arrow", color: "#00f", point: { x: 0, y: 0 } },
    { type: "move", point: { x: 10, y: 0 } },
    { type: "move", point: { x: 20, y: 5 } },
    { type: "end" },
    { type: "start", tool: "redact", color: "#000", point: { x: 30, y: 30 } },
    { type: "move", point: { x: 10, y: 50 } },
    { type: "end" },
  ]);
  expect(s.shapes).toEqual([
    { kind: "arrow", color: "#00f", from: { x: 0, y: 0 }, to: { x: 20, y: 5 } },
    { kind: "redact", from: { x: 30, y: 30 }, to: { x: 10, y: 50 } },
  ]);
});

test("a tap without movement is dropped for pen, arrow and redact", () => {
  for (const tool of ["pen", "arrow", "redact"] as const) {
    expect(run([{ type: "start", tool, color: "#f00", point: { x: 1, y: 1 } }, { type: "end" }]).shapes).toEqual([]);
  }
});

test("text is placed on tap and committed with its label; empty text is dropped", () => {
  const placed = run([{ type: "placeText", point: { x: 4, y: 8 } }]);
  expect(placed.pendingText).toEqual({ x: 4, y: 8 });
  expect(run([{ type: "commitText", text: "  broken ", color: "#f00" }], placed).shapes).toEqual([{ kind: "text", color: "#f00", at: { x: 4, y: 8 }, text: "broken" }]);
  const empty = run([{ type: "commitText", text: "   ", color: "#f00" }], placed);
  expect(empty.shapes).toEqual([]);
  expect(empty.pendingText).toBeNull();
});

test("undo removes the last shape and clear removes all", () => {
  const two = run([
    { type: "start", tool: "arrow", color: "#f00", point: { x: 0, y: 0 } }, { type: "move", point: { x: 9, y: 9 } }, { type: "end" },
    { type: "start", tool: "redact", color: "#000", point: { x: 0, y: 0 } }, { type: "move", point: { x: 9, y: 9 } }, { type: "end" },
  ]);
  expect(run([{ type: "undo" }], two).shapes.map((x) => x.kind)).toEqual(["arrow"]);
  expect(run([{ type: "clear" }], two).shapes).toEqual([]);
});

test("the reducer never mutates previous state", () => {
  const before = run([{ type: "start", tool: "pen", color: "#f00", point: { x: 1, y: 1 } }]);
  const snapshot = JSON.stringify(before);
  run([{ type: "move", point: { x: 2, y: 2 } }, { type: "end" }], before);
  expect(JSON.stringify(before)).toBe(snapshot);
});

test("geometry helpers", () => {
  expect(penPath([{ x: 1, y: 2 }, { x: 3, y: 4 }])).toBe("M1 2 L3 4");
  expect(rectBetween({ x: 30, y: 30 }, { x: 10, y: 50 })).toEqual({ x: 10, y: 30, width: 20, height: 20 });
  const head = arrowHead({ x: 0, y: 0 }, { x: 100, y: 0 }, 20);
  expect(head).toMatch(/^M[\d.-]+ [\d.-]+ L100 0 L[\d.-]+ [\d.-]+$/);
});
