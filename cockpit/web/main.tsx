import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { connect } from "./store";
import { registerWebMcp } from "./webmcp";

connect();
registerWebMcp();
createRoot(document.getElementById("root")!).render(<App />);
