 
 
 export function EnterpriseLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#F6F4F0]">
      <div className="relative w-28 h-28 flex items-center justify-center">
        <div className="absolute inset-0 rounded-2xl bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)]" />

        <div className="relative flex gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor:
                  i === 0
                    ? "#2E5077"
                    : i === 1
                    ? "#4DA1A9"
                    : "#79D7BE",
                animation: `pulseFade 1.6s cubic-bezier(0.4,0,0.2,1) ${i *
                  0.18}s infinite`,
              }}
            />
          ))}
        </div>

        <div
          className="absolute inset-3 rounded-xl border"
          style={{
            borderColor: "#2E5077",
            animation: "rotateSoft 4s linear infinite",
            opacity: 0.15,
          }}
        />
      </div>

      <style>{`
        @keyframes pulseFade {
          0% {
            transform: scale(0.85);
            opacity: 0.4;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
          80% {
            transform: scale(0.85);
            opacity: 0.4;
          }
          100% {
            transform: scale(0.85);
            opacity: 0.4;
          }
        }

        @keyframes rotateSoft {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}