import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Terminal from "./pages/Terminal";
import Dashboard from "./pages/Dashboard";
import TickerView from "./pages/TickerView";
import AIInsights from "./pages/AIInsights";
import MarketPulse from "./pages/MarketPulse";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* New Terminal - No Sidebar, Full Screen */}
          <Route path="/" element={<Terminal />} />

          {/* Legacy Pages - With Sidebar */}
          <Route path="/legacy/*" element={
            <div className="flex min-h-screen w-full">
              <Sidebar />
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/market-pulse" element={<MarketPulse />} />
                <Route path="/ticker" element={<TickerView />} />
                <Route path="/ticker/:symbol" element={<TickerView />} />
                <Route path="/ai-insights" element={<AIInsights />} />
              </Routes>
            </div>
          } />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
