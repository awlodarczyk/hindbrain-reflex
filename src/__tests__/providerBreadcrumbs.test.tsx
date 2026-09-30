import React from "react";
import { render, act } from "@testing-library/react-native";
import { HindbrainProvider } from "../HindbrainProvider";
import { useHindbrain } from "../useHindbrain";
import type { HindbrainContextValue } from "../HindbrainProvider";

function Grab({ onReady }: { onReady: (ctx: HindbrainContextValue) => void }) {
  onReady(useHindbrain());
  return null;
}

test("records screens, manual crumbs and console errors; restores console on unmount", () => {
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  const originalError = console.error;
  let ctx!: HindbrainContextValue;
  const view = render(
    <HindbrainProvider publicKey="hb_pub_x" endpoint="http://x/ingest">
      <Grab onReady={(c) => { ctx = c; }} />
    </HindbrainProvider>,
  );
  act(() => {
    ctx.trackScreen("/clients");
    ctx.trackScreen("/clients");
    ctx.trackScreen("/clients/[id]/plan");
    ctx.addBreadcrumb({ category: "ui", message: 'tap "Save"' });
  });
  console.error("Plan save failed for kinga@example.com");
  expect(errorSpy).toHaveBeenCalledTimes(1);
  const crumbs = ctx.getBreadcrumbs();
  expect(crumbs.map((c) => [c.category, c.message])).toEqual([
    ["navigation", "/clients"],
    ["navigation", "/clients → /clients/[id]/plan"],
    ["ui", 'tap "Save"'],
    ["console", "Plan save failed for [masked]"],
  ]);
  expect(ctx.getCurrentScreen()).toBe("/clients/[id]/plan");
  view.unmount();
  expect(console.error).toBe(originalError);
  errorSpy.mockRestore();
});
