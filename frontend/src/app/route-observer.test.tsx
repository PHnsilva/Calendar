// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import RouteObserver from "./route-observer";
import { resetAnalyticsPageViewForTests } from "../lib/analytics";

function renderAt(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <Routes>
        <Route element={<RouteObserver />}>
          <Route path="*" element={<main>Conteúdo</main>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("route metadata", () => {
  afterEach(() => {
    document.head.innerHTML = "";
    delete window.gtag;
    resetAnalyticsPageViewForTests();
  });

  it("keeps the public homepage indexable with its canonical URL", async () => {
    renderAt("/");
    await waitFor(() => expect(document.title).toContain("SG Pequenos Reparos"));
    expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toContain("index, follow");
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://sgpequenosreparos.com.br/");
  });

  it("marks recovery and other private routes noindex", async () => {
    renderAt("/recover");
    await waitFor(() => expect(document.title).toContain("Recuperar acesso"));
    expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex, nofollow, noarchive");
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://sgpequenosreparos.com.br/recover");
  });
});
