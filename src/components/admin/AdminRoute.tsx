import { useState, useEffect, ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Shield } from "lucide-react";

interface AdminRouteProps {
  children: ReactNode;
  requireSuperAdmin?: boolean;
}

const AdminRoute = ({ children, requireSuperAdmin = false }: AdminRouteProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        if (requireSuperAdmin) {
          // Check for super_admin role specifically
          const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', { 
            _user_id: user.id 
          });
          setIsAuthorized(isSuperAdmin === true);
        } else {
          // Check for any admin role (admin or super_admin)
          const { data: isAdmin } = await supabase.rpc('is_admin', { 
            _user_id: user.id 
          });
          setIsAuthorized(isAdmin === true);
        }
      } catch (error) {
        console.error("Admin access check error:", error);
        setIsAuthorized(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAccess();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAdminAccess();
    });

    return () => subscription.unsubscribe();
  }, [requireSuperAdmin]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-red-500 mx-auto mb-4" />
          <p className="text-slate-400">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    // Redirect to admin login if not authenticated
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
