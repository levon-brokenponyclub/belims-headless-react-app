import React from "react";
import { Facebook, Linkedin, X } from "lucide-react";

interface SocialShareExpertBlockProps {
  productName: string;
  productUrl?: string;
  expertName?: string;
  expertTitle?: string;
  expertImageUrl?: string;
  videoChatUrl?: string;
  chatUrl?: string;
  email?: string;
  phone?: string;
}

export const SocialShareExpertBlock: React.FC<SocialShareExpertBlockProps> = ({
  productName,
  productUrl,
  expertName = "Support Expert",
  expertTitle = "Ask an expert!",
  expertImageUrl,
  videoChatUrl,
  chatUrl,
  email,
  phone,
}) => {
  const shareUrl = productUrl || "";
  const shareText = `Check out ${productName}`;
  const expertInitials = expertName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  const contactLinks = [
    videoChatUrl ? { label: "Video chat", href: videoChatUrl } : null,
    chatUrl ? { label: "Chat", href: chatUrl } : null,
    email ? { label: "Email", href: `mailto:${email}` } : null,
    phone ? { label: phone, href: `tel:${phone}` } : null,
  ].filter(Boolean) as Array<{ label: string; href: string }>;

  const openShare = (url: string) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleShare = (channel: "facebook" | "x" | "linkedin") => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);

    if (channel === "facebook") {
      openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`);
      return;
    }

    if (channel === "x") {
      openShare(
        `https://x.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      );
      return;
    }

    openShare(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    );
  };

  return (
    <div className="mt-10 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-lg font-semibold text-gray-900">
            Got questions?
          </div>
          <div className="text-base text-gray-600">
            Feel free to <span className="text-belims-blue">get in touch</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleShare("facebook")}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900"
            aria-label="Share on Facebook"
          >
            <Facebook size={18} />
          </button>
          <button
            type="button"
            onClick={() => handleShare("x")}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900"
            aria-label="Share on X"
          >
            <X size={18} />
          </button>
          <button
            type="button"
            onClick={() => handleShare("linkedin")}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900"
            aria-label="Share on LinkedIn"
          >
            <Linkedin size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl bg-[#F1F2FF] p-5 shadow-sm sm:flex-row sm:items-center">
        <div className="h-16 w-16 overflow-hidden rounded-full bg-[#ECF0F1]">
          {expertImageUrl ? (
            <img
              src={expertImageUrl}
              alt={expertName}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-belims-blue text-sm font-bold text-white">
              {expertInitials || "SE"}
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="text-lg font-semibold text-gray-900">
            {expertTitle}
          </div>
          <div className="text-[18px] text-grey font-bold">{expertName}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-base text-grey-medium">
            {contactLinks.length > 0 ? (
              contactLinks.map((item, index) => (
                <React.Fragment key={item.label}>
                  <a href={item.href} className="hover:underline">
                    {item.label}
                  </a>
                  {index < contactLinks.length - 1 && (
                    <span className="text-grey-medium">|</span>
                  )}
                </React.Fragment>
              ))
            ) : (
              <span className="text-gray-400">Contact options coming soon</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
