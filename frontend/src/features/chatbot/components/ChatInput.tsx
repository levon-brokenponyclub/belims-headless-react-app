import React, { useRef, useState } from "react";
import { ImageUp, Send } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string, imageFile?: File) => void;
  isLoading: boolean;
  autoFocus?: boolean;
  decisionModeActive?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  autoFocus,
  decisionModeActive = false,
}) => {
  const [value, setValue] = useState("");
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((value.trim() || selectedFile) && !isLoading) {
      onSendMessage(value, selectedFile);
      setValue("");
      setSelectedFile(undefined);
      setSelectedFileName("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(undefined);
      setSelectedFileName("");
      return;
    }

    setSelectedFile(file);
    setSelectedFileName(file.name);
  };

  return (
    <div className="p-3 bg-white/95 backdrop-blur-md">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="flex-1 flex items-center rounded-full border border-violet-200 bg-violet-50/60 shadow-sm px-3 py-1.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="mr-2 text-violet-700 hover:text-violet-800 disabled:opacity-50"
            title="Upload image"
          >
            <ImageUp size={18} />
          </button>

          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ask about products, orders, or promos..."
            autoFocus={autoFocus}
            disabled={isLoading}
            className="flex-1 bg-transparent border-none text-sm text-gray-800 placeholder:text-gray-500 focus:ring-0 outline-none"
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onFileChange}
          className="hidden"
          disabled={isLoading}
        />

        <button
          type="submit"
          disabled={(!value.trim() && !selectedFile) || isLoading}
          className="bg-violet-700 text-white rounded-full p-2.5 w-10 h-10 flex items-center justify-center hover:bg-violet-800 transition-transform hover:-translate-y-0.5 disabled:opacity-50"
        >
          <Send size={17} />
        </button>
      </form>

      <div className="mt-2 text-[11px] text-gray-500 flex items-center justify-between px-1">
        <span>
          {decisionModeActive
            ? "Decision mode: answer 1–3 quick questions for best picks."
            : "Commands: /track, /promo, /points"}
        </span>
        {selectedFileName && (
          <span className="truncate max-w-[50%]" title={selectedFileName}>
            {selectedFileName}
          </span>
        )}
      </div>
    </div>
  );
};
