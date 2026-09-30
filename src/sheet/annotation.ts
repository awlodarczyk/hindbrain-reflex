/** Shapes drawn over a screenshot in the mark-up editor, and the pure state machine behind it. */

export type Point = { readonly x: number; readonly y: number };
export type Tool = 'pen' | 'arrow' | 'text' | 'redact';

export type Shape =
  | { readonly kind: 'pen'; readonly color: string; readonly points: readonly Point[] }
  | { readonly kind: 'arrow'; readonly color: string; readonly from: Point; readonly to: Point }
  | { readonly kind: 'redact'; readonly from: Point; readonly to: Point }
  | { readonly kind: 'text'; readonly color: string; readonly at: Point; readonly text: string };

export type AnnotationState = {
  readonly shapes: readonly Shape[];
  /** Shape being drawn by the current gesture. */
  readonly draft: Shape | null;
  /** Where a text label will go once the user types it. */
  readonly pendingText: Point | null;
};

export type AnnotationAction =
  | { type: 'start'; tool: Exclude<Tool, 'text'>; color: string; point: Point }
  | { type: 'move'; point: Point }
  | { type: 'end' }
  | { type: 'placeText'; point: Point }
  | { type: 'commitText'; text: string; color: string }
  | { type: 'undo' }
  | { type: 'clear' };

export const initialAnnotation: AnnotationState = { shapes: [], draft: null, pendingText: null };

/** Minimum drag, in points, for a stroke/arrow/box to count; shorter is a tap. */
const MIN_DRAG = 4;

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function extend(draft: Shape, point: Point): Shape {
  switch (draft.kind) {
    case 'pen':
      return { ...draft, points: [...draft.points, point] };
    case 'arrow':
    case 'redact':
      return { ...draft, to: point };
    default:
      return draft;
  }
}

function isMeaningful(shape: Shape): boolean {
  switch (shape.kind) {
    case 'pen': {
      const first = shape.points[0];
      return first !== undefined && shape.points.some((p) => dist(p, first) >= MIN_DRAG);
    }
    case 'arrow':
    case 'redact':
      return dist(shape.from, shape.to) >= MIN_DRAG;
    default:
      return true;
  }
}

export function annotate(state: AnnotationState, action: AnnotationAction): AnnotationState {
  switch (action.type) {
    case 'start': {
      const { tool, color, point } = action;
      const draft: Shape =
        tool === 'pen' ? { kind: 'pen', color, points: [point] }
        : tool === 'arrow' ? { kind: 'arrow', color, from: point, to: point }
        : { kind: 'redact', from: point, to: point };
      return { ...state, draft, pendingText: null };
    }
    case 'move':
      return state.draft ? { ...state, draft: extend(state.draft, action.point) } : state;
    case 'end':
      if (!state.draft) return state;
      return { ...state, draft: null, shapes: isMeaningful(state.draft) ? [...state.shapes, state.draft] : state.shapes };
    case 'placeText':
      return { ...state, draft: null, pendingText: action.point };
    case 'commitText': {
      const text = action.text.trim();
      if (!state.pendingText) return state;
      const shapes = text ? [...state.shapes, { kind: 'text' as const, color: action.color, at: state.pendingText, text }] : state.shapes;
      return { ...state, shapes, pendingText: null };
    }
    case 'undo':
      return { ...state, shapes: state.shapes.slice(0, -1) };
    case 'clear':
      return initialAnnotation;
  }
}

const n = (v: number) => Math.round(v * 10) / 10;

export function penPath(points: readonly Point[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${n(p.x)} ${n(p.y)}`).join(' ');
}

/** Two short strokes meeting at `to`, angled back along the shaft. */
export function arrowHead(from: Point, to: Point, size = 16): string {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const spread = Math.PI / 7;
  const a = { x: to.x - size * Math.cos(angle - spread), y: to.y - size * Math.sin(angle - spread) };
  const b = { x: to.x - size * Math.cos(angle + spread), y: to.y - size * Math.sin(angle + spread) };
  return `M${n(a.x)} ${n(a.y)} L${n(to.x)} ${n(to.y)} L${n(b.x)} ${n(b.y)}`;
}

export function rectBetween(a: Point, b: Point): { x: number; y: number; width: number; height: number } {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
}
