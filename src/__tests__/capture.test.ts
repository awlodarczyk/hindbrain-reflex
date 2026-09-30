import { captureScreenshot, pickMedia } from "../capture";
import type { LocalAttachment } from "../attachments";

beforeEach(() => {
  (globalThis as any).fetch = jest.fn(async () => ({ blob: async () => ({ size: 4200 }) }));
});

test("captures a JPEG screenshot at device resolution", async () => {
  const viewShot = { captureRef: jest.fn(async () => "file:///tmp/s.jpg") };
  const shot = await captureScreenshot(viewShot, {});
  expect(shot).toMatchObject({ kind: "screenshot", mime: "image/jpeg", bytes: 4200, uri: "file:///tmp/s.jpg" });
  // Window is 375x812 (jest mock) at a pixel ratio of 2 (jest mock) -> 750x1624, under the pixel cap.
  expect(viewShot.captureRef).toHaveBeenCalledWith({}, { format: "jpg", quality: 0.9, result: "tmpfile", width: 750, height: 1624 });
});

test("falls back to the low-res capture when the high-res one is still too large", async () => {
  (globalThis as any).fetch = jest
    .fn()
    .mockResolvedValueOnce({ blob: async () => ({ size: 6 * 1024 * 1024 }) })
    .mockResolvedValueOnce({ blob: async () => ({ size: 4200 }) });
  const viewShot = { captureRef: jest.fn(async () => "file:///tmp/s.jpg") };
  const shot = await captureScreenshot(viewShot, {});
  expect(shot).toMatchObject({ bytes: 4200 });
  expect(viewShot.captureRef).toHaveBeenNthCalledWith(1, {}, { format: "jpg", quality: 0.9, result: "tmpfile", width: 750, height: 1624 });
  expect(viewShot.captureRef).toHaveBeenNthCalledWith(2, {}, { format: "jpg", quality: 0.8, result: "tmpfile" });
});

test("no view-shot, no view or a capture error means no screenshot", async () => {
  expect(await captureScreenshot(null, {})).toBeNull();
  expect(await captureScreenshot({ captureRef: jest.fn() }, null)).toBeNull();
  expect(await captureScreenshot({ captureRef: jest.fn(async () => { throw new Error("x"); }) }, {})).toBeNull();
});

test("picked media respects the per-report limits", async () => {
  const img = (n: number) => ({ uri: `file:///i${n}.jpg`, type: "image" as const, mimeType: "image/jpeg", fileSize: 1000, width: 100.4, height: 200 });
  const video = { uri: "file:///v.mp4", type: "video" as const, mimeType: "video/mp4", fileSize: 60 * 1024 * 1024, duration: 14200 };
  const smallVideo = { ...video, uri: "file:///v2.mp4", fileSize: 1000 };
  const picker = { launchImageLibraryAsync: jest.fn(async () => ({ canceled: false, assets: [img(1), img(2), video, smallVideo] })) };
  const current: LocalAttachment[] = [1, 2, 3, 4].map((n) => ({ clientId: `c${n}`, kind: "image", mime: "image/jpeg", bytes: 1, uri: `file:///c${n}` }));
  const added = await pickMedia(picker, current);
  expect(added.map((a) => a.uri)).toEqual(["file:///i1.jpg", "file:///v2.mp4"]);
  expect(added[0]).toMatchObject({ kind: "image", width: 100, height: 200 });
  expect(added[1]).toMatchObject({ kind: "video", durationMs: 14200 });
});

test("a cancelled picker adds nothing", async () => {
  const picker = { launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: null })) };
  expect(await pickMedia(picker, [])).toEqual([]);
  expect(await pickMedia(null, [])).toEqual([]);
});

test("captureScreenshot normalises a bare path to a file:// URI", async () => {
  const shot = await captureScreenshot({ captureRef: async () => "/private/var/tmp/s.jpg" }, {});
  expect(shot?.uri).toBe("file:///private/var/tmp/s.jpg");
  expect((globalThis as any).fetch).toHaveBeenCalledWith("file:///private/var/tmp/s.jpg");
});
