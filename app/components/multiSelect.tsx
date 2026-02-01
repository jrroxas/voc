"use client";
import { useState, useRef, useEffect } from "react";
import { FiX } from "react-icons/fi";
import { FaPlus } from "react-icons/fa6";

type MultiSelectProps = {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
};

export default function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options...",
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const removeOption = (option: string) => {
    onChange(selected.filter((item) => item !== option));
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-3xl shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="soft-select mt-6 w-full pl-5 pr-5 border border-white border-solid rounded-2xl py-2 px-3">
        {selected.length > 0 ? (
          <div className="flex flex-wrap items-center gap-">
            {selected.map((item) => (
              <div
                key={item}
                className="bg-color-primary-green text-white px-3 py-1 rounded-full items-center gap-2 w-fit inline-flex mr-2 mt-1 mb-1"
              >
                <span className="text-sm">{item}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeOption(item);
                  }}
                  className="hover:text-gray-200"
                >
                  <FiX size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="text-color-green-uno hover:text-gray-600 p-2 cursor-pointer"
              aria-label="Add more categories"
            >
              <FaPlus size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-color-green-uno hover:text-gray-600 p-2 cursor-pointer flex items-center gap-2"
          >
            <FaPlus size={16} />
            <span className="text-gray-500">{placeholder}</span>
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 border border-white border-solid rounded-lg bg-white text-black shadow-lg z-50 max-h-64 overflow-y-auto">
          <div className="sticky top-0 bg-white p-2 border-b border-gray-200 flex items-center gap-2">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-color-green-primary text-sm"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <FiX size={18} />
              </button>
            )}
          </div>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <label
                key={option}
                className="flex items-center gap-3 p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggleOption(option)}
                  className="w-4 h-4 cursor-pointer bg-green-700"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))
          ) : (
            <div className="p-3 text-center text-gray-500 text-sm">
              No options found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
