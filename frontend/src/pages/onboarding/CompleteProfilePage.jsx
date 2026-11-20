import { motion } from "framer-motion";
import CompleteProfile from "@/pages/onboarding/CompleteProfile";

export default function CompleteProfilePage() {
  return (
    <motion.div
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className="min-h-screen bg-[#F6F4F0] flex justify-center pt-2"
    >
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl p-8">
        <CompleteProfile />
      </div>
    </motion.div>
  );
}
