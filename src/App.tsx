import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Exams from "./pages/Exams";
import ExamDetail from "./pages/ExamDetail";
import Practice from "./pages/Practice";
import Dashboard from "./pages/Dashboard";
import Payments from "./pages/Payments";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminOverview from "./pages/admin/AdminOverview";
import AdminExams from "./pages/admin/AdminExams";
import AdminExamStructure from "./pages/admin/AdminExamStructure";
import AdminQuestions from "./pages/admin/AdminQuestions";
import AdminPayments from "./pages/admin/AdminPayments";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/exams" element={<Exams />} />
            <Route path="/exam/:slug" element={<ExamDetail />} />
            
            {/* Protected Routes */}
            <Route path="/practice" element={<Practice />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/payments" element={<Payments />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminOverview />} />
            <Route path="/admin/exams" element={<AdminExams />} />
            <Route path="/admin/exams/:examId/structure" element={<AdminExamStructure />} />
            <Route path="/admin/questions" element={<AdminQuestions />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
            
            {/* Catch All */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
