import { en, pl, resolveStrings, format } from "../i18n";

test("Polish covers every English key", () => {
  expect(Object.keys(pl).sort()).toEqual(Object.keys(en).sort());
  for (const [k, v] of Object.entries(pl)) expect([k, v.length > 0]).toEqual([k, true]);
});

test("picks Polish for pl-* locales and English otherwise", () => {
  expect(resolveStrings("pl-PL").hubTitle).toBe(pl.hubTitle);
  expect(resolveStrings("pl").hubTitle).toBe(pl.hubTitle);
  expect(resolveStrings("de-DE").hubTitle).toBe(en.hubTitle);
  expect(resolveStrings(undefined).hubTitle).toBe(en.hubTitle);
});

test("host overrides win over the built-in copy", () => {
  expect(resolveStrings("pl-PL", { hubTitle: "Hej!" }).hubTitle).toBe("Hej!");
  expect(resolveStrings("pl-PL", { hubTitle: "Hej!" }).bugSubmit).toBe(pl.bugSubmit);
});

test("format fills {placeholders} and leaves unknown ones", () => {
  expect(format("Vote for {title}, {count} votes", { title: "Dark mode", count: 41 })).toBe("Vote for Dark mode, 41 votes");
  expect(format("Hi {name}", {})).toBe("Hi {name}");
});
