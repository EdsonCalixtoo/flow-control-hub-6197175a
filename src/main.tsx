import { createRoot } from "react-dom/client";
import App from "./App.tsx";

if (!window.crypto) {
  (window as any).crypto = {};
}
if (!window.crypto.randomUUID) {
  window.crypto.randomUUID = function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
}

import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
