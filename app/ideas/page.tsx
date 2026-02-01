"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import IdeaItem from "../components/ideaItem";
import { ibmPlexMono } from "../fonts";
import { FiX, FiArrowRight, FiArrowLeft } from "react-icons/fi";

type IdeaRecord = {
  id?: number;
  full_text?: string;
  pageContent?: string;
  created_at?: string;
  date_created?: string;
  uuid?: string;
  categories?: string;
  merged?: boolean;
  has_parent?: number | null;
};

function formatDate(dateStr?: string) {
  if (!dateStr) return "No date";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "No date";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function truncateText(text?: string, max = 70) {
  if (!text) return "";
  if (text.length <= max) return text;
  const keep = Math.max(0, max - 3);
  return text.slice(0, keep) + "...";
}

export default function IdeasPage() {
  const [latestIdeas, setLatestIdeas] = useState<IdeaRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdeaIndex, setSelectedIdeaIndex] = useState<number | null>(null);
  const [modalActive, setModalActive] = useState(false);
  const modalCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const modalCloseTimeoutRef = useRef<number | null>(null);

  const [relatedIdeas, setRelatedIdeas] = useState<IdeaRecord[]>([]);
  const [relatedIdeasLoading, setRelatedIdeasLoading] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchIdeas();
  }, [page, searchTerm]);

  async function fetchIdeas() {
    setLoading(true);
    setSelectedIdeaIndex(null);
    setRelatedIdeas([]);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (searchTerm) params.append("search", searchTerm);

      const response = await fetch(`/api/ideas?${params.toString()}`);
      const data = await response.json();
      if (response.ok && Array.isArray(data?.ideas)) {
        setLatestIdeas(data.ideas);
        setTotalPages(Math.max(1, data.totalPages || 1));
      } else {
        console.error("Failed to fetch latest ideas:", data);
        setLatestIdeas([]);
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Failed to fetch latest ideas:", err);
      setLatestIdeas([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRelatedIdeas(hasParent: number | null | undefined) {
    if (hasParent === null || hasParent === undefined) {
      setRelatedIdeas([]);
      return;
    }

    setRelatedIdeasLoading(true);
    try {
      const response = await fetch("/api/ideas/related", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ hasParent }),
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        setRelatedIdeas(data);
      } else {
        console.error("Failed to fetch related ideas:", data);
        setRelatedIdeas([]);
      }
    } catch (err) {
      console.error("Error fetching related ideas:", err);
      setRelatedIdeas([]);
    } finally {
      setRelatedIdeasLoading(false);
    }
  }

  function closeModal() {
    setModalActive(false);
    if (modalCloseTimeoutRef.current) window.clearTimeout(modalCloseTimeoutRef.current);
    modalCloseTimeoutRef.current = window.setTimeout(() => {
      setSelectedIdeaIndex(null);
    }, 200);
  }

  useEffect(() => {
    if (selectedIdeaIndex !== null && latestIdeas[selectedIdeaIndex]) {
      setModalActive(true);

      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") closeModal();
      };
      document.addEventListener("keydown", onKey);

      const focusTimer = window.setTimeout(() => modalCloseButtonRef.current?.focus(), 220);

      fetchRelatedIdeas(latestIdeas[selectedIdeaIndex].has_parent);

      return () => {
        document.removeEventListener("keydown", onKey);
        window.clearTimeout(focusTimer);
        if (modalCloseTimeoutRef.current) {
          window.clearTimeout(modalCloseTimeoutRef.current);
          modalCloseTimeoutRef.current = null;
        }
      };
    }
  }, [selectedIdeaIndex, latestIdeas]);

  const selectedIdea = selectedIdeaIndex !== null ? latestIdeas[selectedIdeaIndex] : null;
  const historyIdeas = selectedIdea
    ? relatedIdeas.filter((idea) => idea.uuid !== selectedIdea.uuid)
    : [];

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearchTerm(searchInput.trim());
  }

  const gridStyle = {
    backgroundImage: 'linear-gradient(rgb(0, 0, 0) 1px, transparent 1px), linear-gradient(90deg, rgb(0, 0, 0) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
    // Add other styles like width, height, etc. to see the grid
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0', // Fallback or base color
  };

  return (
    <main className="min-h-screen w-full bg-slate-50 relative overflow-x-hidden selection:bg-lime-500/20 selection:text-lime-900 pb-10">

      <div className="fixed inset-0 z-0 pointer-events-none" data-id="element-1">
        <div className="absolute inset-0 opacity-[0.03]" data-id="element-2" style={gridStyle}></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-lime-500/12 blur-[120px] rounded-full mix-blend-multiply" data-id="element-3"></div>
        <div className="absolute bottom-0 right-[50px]  top-[200px] w-[600px] h-[400px] bg-blue-500/12 blur-[100px] rounded-full mix-blend-multiply" data-id="element-4"></div>
      </div>

      <div className="w-full max-w-4xl mx-auto flex justify-between items-center mb-8 mt-8">
        <img src="/assets/jway-logo.png" alt="JWay Group" width={162} height={40} className="" />
        <div className={`${ibmPlexMono.className} antialiased text-sm tracking-wider text-gray-600 font-medium uppercase flex items-center gap-2`}>
          <div className="h-1.5 w-1.5 rounded-full bg-lime-500 animate-pulse" data-id="element-11"></div>
          <div>Voice of the Customer</div>
        </div>
      </div>

      <div className="w-full max-w-3xl mt-12 mb-6 flex justify-between items-center mr-auto ml-auto">
        
        <a 
                href="/"
                className="group px-5 py-2.5 text-color-green-uno text-sm font-medium rounded-lg hover:opacity-90 transition-all duration-200 flex items-center gap-2"
              >
                <FiArrowLeft className="transition-transform duration-200 group-hover:translate-x-1" />
                <span>Back</span>
                
              </a>

        <form onSubmit={handleSearchSubmit} className="flex w-full md:w-auto gap-2 mt-4 md:mt-0">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search ideas"
            className="bg-white flex-1 md:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-color-primary-gree"
            aria-label="Search ideas"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-color-primary-green text-white rounded-lg text-sm hover:opacity-90"
            aria-label="Search"
          >
            Search
          </button>
        </form>
      </div>

      <div>
          <h1 className={`${ibmPlexMono.className} text-2xl font-semibold text-gray-700 w-full max-w-3xl mt-8 block mr-auto ml-auto text-center mb-10`}>
            Latest Ideas
          </h1>
      </div>

      {loading ? (
        <div className="w-full max-w-3xl text-center py-8 mr-auto ml-auto">
          <div className="inline-flex items-center gap-3 justify-center">
            <svg className="w-6 h-6 text-color-primary animate-spin" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span>Loading latest ideas...</span>
          </div>
        </div>
      ) : latestIdeas.length === 0 ? (
        <div className="w-full max-w-3xl mr-auto ml-auto text-center py-8 text-gray-600">No ideas found</div>
      ) : (
        <>
          <div id="latest-ideas-list" className="w-full max-w-3xl ml-auto mr-auto px-4">
            {latestIdeas.map((idea, idx) => (
              <IdeaItem
                key={idea.id ?? idea.uuid ?? idx}
                itemId={idx}
                title={truncateText(idea.full_text || idea.pageContent, 70)}
                percentage={0}
                date={formatDate(idea.created_at || idea.date_created)}
                onClick={() => setSelectedIdeaIndex(idx)}
                isLatest={true}
              />
            ))}
          </div>

          <div className="w-full max-w-3xl ml-auto mr-auto px-4 mt-6 flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Page {page} of {totalPages}
              </span>
              <span>{searchTerm ? `Results for "${searchTerm}"` : "All ideas"}</span>
            </div>
            <div className="flex justify-center items-center gap-2 flex-wrap">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1 || loading}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Previous
              </button>
              <div className="flex gap-1 flex-wrap justify-center">
                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 3), Math.min(totalPages, page + 2)).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    disabled={loading}
                    className={`px-3 py-2 rounded-lg ${
                      page === p ? "bg-color-primary-green text-white" : "border border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages || loading}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          </div>

          {selectedIdea && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className={`absolute inset-0 bg-black transition-opacity duration-200 ${modalActive ? "opacity-50" : "opacity-0 pointer-events-none"}`}
                onClick={closeModal}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-hidden={!modalActive}
                aria-labelledby="idea-modal-title"
                className={`relative bg-white rounded-lg p-6 max-w-2xl w-full max-h-150 overflow-y-auto shadow-lg z-10 transform transition-all duration-200 ${modalActive ? "opacity-100 translate-y-0 scale-100 pointer-events-auto" : "opacity-0 translate-y-2 scale-95 pointer-events-none"}`}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h3 id="idea-modal-title" className="text-lg font-semibold">
                    Idea
                  </h3>
                  {selectedIdea.merged && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded whitespace-nowrap">Merged</span>
                  )}
                </div>

                <div className="mb-6">
                  <p className="text-sm font-semibold text-gray-600 mb-2">Voice of the Customer:</p>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-200 p-3 rounded">
                    {selectedIdea.full_text || selectedIdea.pageContent}
                  </div>
                  {selectedIdea.categories && (
                    <div className="text-xs text-gray-600 mt-2">Products: {selectedIdea.categories}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">{formatDate(selectedIdea.created_at || selectedIdea.date_created)}</div>
                </div>

                {historyIdeas.length > 0 && (
                  <div className="mb-6">
                    <p className="text-sm font-semibold text-gray-600 mb-3">History:</p>
                    {relatedIdeasLoading ? (
                      <p className="text-xs text-gray-500">Loading history...</p>
                    ) : (
                      <div className="space-y-3">
                        {historyIdeas.map((idea, idx) => (
                          <div key={idx} className="border-l-2 border-gray-300 pl-3 py-2">
                            <div className="text-sm text-gray-700">{idea.full_text}</div>
                            <div className="text-xs text-gray-500 mt-1">{formatDate(idea.created_at)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="text-right">
                  <button
                    ref={modalCloseButtonRef}
                    onClick={closeModal}
                    className="px-4 py-2 bg-color-primary-green text-white rounded"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
