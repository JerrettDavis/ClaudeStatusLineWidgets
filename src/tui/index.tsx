import React from "react";
import { render } from "ink";
import { App } from "./app.js";
import type { Provider } from "../config/schema.js";

export async function runTUI(provider: Provider | null = null): Promise<void> {
  const { waitUntilExit } = render(<App provider={provider} />);
  await waitUntilExit();
}

