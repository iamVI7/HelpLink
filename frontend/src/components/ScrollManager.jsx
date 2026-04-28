import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollManager = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Dashboard → preserve scroll
    if (pathname.startsWith("/dashboard")) return;

    // Emergency / tracking → instant top
    const isEmergency =
      pathname.includes("tracking") ||
      pathname.includes("sos");

    if (isEmergency) {
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    // Normal pages → smooth scroll
    window.scrollTo({ top: 0, behavior: "smooth" });

  }, [pathname]);

  return null;
};

export default ScrollManager;