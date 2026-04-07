import { jsx as _jsx } from "react/jsx-runtime";
import { render } from "ink";
import { App } from "./app.js";
export async function runTUI() {
    const { waitUntilExit } = render(_jsx(App, {}));
    await waitUntilExit();
}
