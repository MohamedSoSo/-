"use client";

import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { AppImage, ASSET_KEYS } from "@bbq/ui";

// Reduced-motion handling for all animations in this tree is centralized in
// <MotionProvider> (MotionConfig reducedMotion="user") — see that file for
// why per-component useReducedMotion() conditionals aren't used here.
export function HeroSection() {
  const t = useTranslations("home");

  return (
    <div className="relative h-72 sm:h-96 lg:h-[32rem] overflow-hidden">
      <motion.div
        data-animate
        className="absolute inset-0"
        initial={{ opacity: 0, scale: 1.08 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <AppImage
          assetKey={ASSET_KEYS.heroBgCustomer}
          alt="Smart BBQ"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </motion.div>

      <div className="absolute inset-0 bg-charcoal-900/35" />
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900 via-charcoal-900/25 to-charcoal-900/45" />

      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center text-center px-4"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.12, delayChildren: 0.35 } },
        }}
      >
        <motion.h1
          data-animate
          className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-white tracking-tight"
          variants={{
            hidden: { opacity: 0, y: 18 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
          }}
        >
          {t("heroTitle")}
        </motion.h1>
        <motion.p
          data-animate
          className="text-charcoal-100 text-sm sm:text-base lg:text-lg mt-3"
          variants={{
            hidden: { opacity: 0, y: 14 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
          }}
        >
          {t("heroSubtitle")}
        </motion.p>
        <motion.a
          href="#menu"
          data-animate
          className="inline-flex items-center justify-center gap-2 rounded-xl2 text-sm sm:text-base font-medium bg-ember-500 text-charcoal-900 hover:bg-ember-400 hover:shadow-ember px-7 sm:px-9 py-3 sm:py-3.5 mt-7 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal-900"
          variants={{
            hidden: { opacity: 0, y: 14 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
          }}
        >
          {t("ctaOrderNow")}
          <ChevronDown size={18} aria-hidden="true" />
        </motion.a>
      </motion.div>
    </div>
  );
}
