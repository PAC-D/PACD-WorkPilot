import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

let lastReconcile=0;
function reconcileActiveQueries(){
  if(Date.now()-lastReconcile<500)return;
  lastReconcile=Date.now();
  void queryClient.invalidateQueries({predicate:query=>query.isActive()});
}
window.addEventListener("online",reconcileActiveQueries);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")reconcileActiveQueries();});

const root = document.getElementById("root");

if (!root) {
  throw new Error("Application root was not found");
}

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);

