// @ts-nocheck — Node fs/path in a lint-style check; the SDK ships no @types/node.
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

// Hosts using NativeWind compile this SDK with jsxImportSource "nativewind"; its
// css-interop wrapper drops function-valued `style` props (seen on Pressable), which
// silently unstyles the component. Keep every style static.
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "__tests__" || name === "__mocks__" ? [] : sources(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

test("no component uses a function as its style prop", () => {
  const offenders = sources(join(__dirname, "..")).filter((file) => /style=\{\s*\(/.test(readFileSync(file, "utf8")));
  expect(offenders).toEqual([]);
});
