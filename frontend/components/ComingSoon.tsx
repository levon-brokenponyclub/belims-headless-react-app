import React from "react";

export const ComingSoon = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-belims-navy text-white">
      <div className="container mx-auto px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <img
            src="/images/belims-logo-white.png"
            alt="Belims"
            className="h-12 mx-auto mb-8 object-contain"
          />
          <h1 className="text-4xl md:text-6xl font-bold mb-4 font-heading">
            Coming Soon
          </h1>
          <p className="text-lg md:text-xl text-white/80 mb-8 font-body">
            We&apos;re building something great. Our new online store is launching
            shortly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:info@belims.co.za"
              className="inline-flex items-center justify-center px-8 py-3 bg-white text-belims-navy font-semibold rounded hover:bg-gray-100 transition-colors"
            >
              Get in touch
            </a>
            <a
              href="tel:+27123456789"
              className="inline-flex items-center justify-center px-8 py-3 border border-white/30 text-white font-semibold rounded hover:bg-white/10 transition-colors"
            >
              Call us
            </a>
          </div>
          <p className="mt-12 text-sm text-white/50">
            &copy; {new Date().getFullYear()} Belims. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};
