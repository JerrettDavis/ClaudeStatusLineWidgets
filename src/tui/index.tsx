import React from "react";
import { render } from "ink";
import { App } from "./app.js";

export async function runTUI(): Promise<void> {
  const { waitUntilExit } = render(<App />);
  await waitUntilExit();
}
