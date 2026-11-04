import AuthInitializer from "@/app/AuthInitialiser";
import AppRoutes from "@/app/AppRoutes";
import { MotionConfig } from "framer-motion";


export default function App() {
  return (
    <>
      <AuthInitializer>
        <MotionConfig reducedMotion="user">
          <AppRoutes />
        </MotionConfig>
      </AuthInitializer>
    </>
  );
}
