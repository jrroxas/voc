"use client";
import { useState, useRef, useEffect } from "react";
import { ibmPlexMono } from "./fonts";
import { MdOutlineMicNone } from "react-icons/md";
import { FaPlus } from "react-icons/fa6";
import { FaArrowUp } from "react-icons/fa";
import { FiX, FiArrowRight } from "react-icons/fi";
import IdeaItem from "./components/ideaItem";
import MultiSelect from "./components/multiSelect";

export default function Home() {
  const [text, setText] = useState("");
  const [noResult, setNoResult] = useState(false);
  const [results, setResults] = useState<Array<{ pageContent: string; created_at?: string; score?: number; vector_uuid?: string; text_uuid?: string; categories?: string; merge?: boolean; has_parent?: number | null}>>([]);
  const [loading, setLoading] = useState(false);
  const [inputMode, setInputMode] = useState<"type" | "upload">("type");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [mergeLoading, setMergeLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [selectedIdea, setSelectedIdea] = useState<number | null>(null);
  const modalCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const [modalActive, setModalActive] = useState(false);
  const modalCloseTimeoutRef = useRef<number | null>(null);
  const [errorModalActive, setErrorModalActive] = useState(false);
  const errorCloseTimeoutRef = useRef<number | null>(null);
  const [successModalActive, setSuccessModalActive] = useState(false);
  const successCloseTimeoutRef = useRef<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [latestIdeas, setLatestIdeas] = useState<Array<{ id?: number; full_text?: string; created_at?: string; uuid?: string; categories?: string; merged?: boolean; has_parent?: number | null; score?: number; percentage?: number }>>([])
  const [selectedLatestIdea, setSelectedLatestIdea] = useState<number | null>(null);
  const [confirmMerge, setConfirmMerge] = useState(false);
  const [confirmMergeModalActive, setConfirmMergeModalActive] = useState(false);
  const [relatedIdeas, setRelatedIdeas] = useState<Array<{ id?: number; full_text?: string; created_at?: string; uuid?: string; categories?: string; merged?: boolean; has_parent?: number | null }>>([]);
  const [relatedIdeasLoading, setRelatedIdeasLoading] = useState(false);

  const categories = [
    "Advanced Solutions",
    "Analytics",
    "Carousels",
    "Central Med Automation Service (CMAS)",
    "Central Pharmacy Manager (CPM)",
    "Cloud Hosted OmniCenter (CHOC)",
    "Controlled Substance Manager (CSM)",
    "CP Software",
    "CPBP",
    "Data",
    "Diversion",
    "EMM",
    "Infrastructure Upgrades",
    "IVX Manager",
    "IVX Station",
    "IVX Workflow",
    "OmniCenter",
    "OmniSphere",
    "Packagers",
    "Robot-Rx. ProManager",
    "ServerScale",
    "SupplyXpert",
    "XR2",
    "XT AWS",
    "XT Supply",
    "XT-ADC",
    "XTExtend / XTA-Core",
    "Yuyama",
  ];

  // Load persisted results from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("voc_results");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setResults(parsed);
      }
    } catch (e) {
      console.warn("Failed to load persisted results", e);
    }
  }, []);

  // Fetch latest ideas from PostgreSQL database
  async function fetchLatestIdeas() {
    try {
      const response = await fetch("/api/ideas/latest");
      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        setLatestIdeas(data);
      } else {
        console.error("Failed to fetch latest ideas:", data);
      }
    } catch (err) {
      console.error("Failed to fetch latest ideas:", err);
    }
  }

  // Fetch related ideas when a latest idea modal is opened
  async function fetchRelatedIdeas(hasParent: number | null | undefined) {
    if (hasParent === null || hasParent === undefined) {
      setRelatedIdeas([]);
      return;
    }

    setRelatedIdeasLoading(true);
    try {
      const response = await fetch('/api/ideas/related', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hasParent }),
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        setRelatedIdeas(data);
      } else {
        console.error('Failed to fetch related ideas:', data);
        setRelatedIdeas([]);
      }
    } catch (err) {
      console.error('Error fetching related ideas:', err);
      setRelatedIdeas([]);
    } finally {
      setRelatedIdeasLoading(false);
    }
  }

  // Load latest ideas on mount
  useEffect(() => {
    fetchLatestIdeas();
  }, []);

  // Fetch related ideas when selectedLatestIdea changes
  useEffect(() => {
    if (selectedLatestIdea !== null && latestIdeas[selectedLatestIdea]) {
      fetchRelatedIdeas(latestIdeas[selectedLatestIdea].has_parent);
    }
  }, [selectedLatestIdea, latestIdeas]);

  // Persist results to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("voc_results", JSON.stringify(results));
    } catch (e) {
      console.warn("Failed to persist results", e);
    }
  }, [results]);

  async function handleSubmit() {
    setLoading(true);
    // clear previous results so the UI shows the loading state
    setResults([]);
    // mark results area active for this session/search
    setShowResults(true);

    try {
      // Build FormData so n8n can receive `full_text`, `selected_categories` and `full_document` fields
      const form = new FormData();
      form.append("full_text", text);
      if (selectedCategories.length > 0) {
        form.append("selected_categories", JSON.stringify(selectedCategories));
      }
      const file = fileInputRef.current?.files?.[0];
      if (file) form.append("full_document", file, file.name);

      // Call n8n directly from client (no server proxy needed)
      const N8N_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || "http://localhost:5678/webhook/c8d7e45a-188b-4aa8-8b20-3ed1ec4bad4f";
      const res = await fetch(N8N_URL, {
        method: "POST",
        body: form,
      });

      let data: any;

      try {
        data = await res.json();
      } catch (e) {
        // non-JSON response
        const text = await res.text();
        setErrorMessage(text || "No response");
        setResults([]);
        return;
      }

    // If server returned a stringified JSON, try to parse it
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {}
    }

    // Handle upstream workflow errors (n8n) and show a friendly message
      if (data && typeof data === "object" && typeof data.message === "string") {
        setErrorMessage("Can't process your request — make sure your fields are not blank or empty.");
        setResults([]);
        setText("");
        return;
      }

    const normalizeRecord = (r: any) => {
      const pageContent = r.full_text ?? "";
      const categories = r.categories ?? "";
      const created_at = r.created_at ?? undefined;
      const score = r.percentage ?? undefined;
      const vector_uuid = r.uuid ?? undefined;
      const has_parent = r.has_parent ?? undefined;
      const text_uuid = undefined; // not in new structure
      return { pageContent, created_at, score, vector_uuid, categories, has_parent};
    };

    // If the top-level value is an array, normalize it
    if (Array.isArray(data)) {
      setResults(data.map(normalizeRecord));
      return;
    }

    // If not array, search for the first nested array in top-level properties
    if (data && typeof data === "object") {
      const nestedArrays = Object.values(data).filter((v) => Array.isArray(v));
      if (nestedArrays.length > 0) {
        setResults((nestedArrays[0] as any[]).map(normalizeRecord));
        return;
      }
    }

    // If it's a single object with document, normalize into an array
    if (data && (data.document || data.pageContent || data.metadata || data.score)) {
      setResults([normalizeRecord(data)]);
      return;
    }

    // Fallback: show raw
    setErrorMessage(typeof data === "string" ? data : JSON.stringify(data) || "No response");
    setResults([]);
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to process request");
      setResults([]);
    } finally {
      setLoading(false);
    }

  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return "No date";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "No date";
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  }

  function getLatestByParent(items: typeof results) {
    // Group by has_parent and keep only the latest of each group
    const grouped = new Map<string | undefined, typeof results[0]>();
    
    items.forEach(item => {
      const parentKey = item.has_parent !== undefined && item.has_parent !== null ? String(item.has_parent) : 'no-parent';
      const existing = grouped.get(parentKey);
      
      // Keep the one with the latest created_at date
      if (!existing || new Date(item.created_at || 0) > new Date(existing.created_at || 0)) {
        grouped.set(parentKey, item);
      }
    });
    
    // Return as array, maintaining original order
    return Array.from(grouped.values());
  }

  function truncateText(text?: string, max = 70) {
    if (!text) return "";
    if (text.length <= max) return text;
    // keep total length equal to `max` including the ellipsis
    const keep = Math.max(0, max - 3);
    return text.slice(0, keep) + "...";
  }

  function closeError() {
    // animate close then clear message
    setErrorModalActive(false);
    if (errorCloseTimeoutRef.current) window.clearTimeout(errorCloseTimeoutRef.current);
    errorCloseTimeoutRef.current = window.setTimeout(() => setErrorMessage(null), 200);
  }

  function closeSuccess() {
    // animate close then clear message
    setSuccessModalActive(false);
    if (successCloseTimeoutRef.current) window.clearTimeout(successCloseTimeoutRef.current);
    successCloseTimeoutRef.current = window.setTimeout(() => setSuccessMessage(null), 200);
  }

  useEffect(() => {
    if (errorMessage != null) {
      setErrorModalActive(true);
    }
  }, [errorMessage]);

  useEffect(() => {
    if (successMessage != null) {
      setSuccessModalActive(true);
    }
  }, [successMessage]);

  // Modal: close selected idea with animation
  function closeModal() {
    // start closing animation
    setModalActive(false);
    if (modalCloseTimeoutRef.current) window.clearTimeout(modalCloseTimeoutRef.current);
    modalCloseTimeoutRef.current = window.setTimeout(() => {
      setSelectedIdea(null);
      setSelectedLatestIdea(null);
    }, 200);
  }

  useEffect(() => {
    if (selectedIdea !== null) {
      setModalActive(true);

      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") closeModal();
      };
      document.addEventListener("keydown", onKey);

      // focus the close button after the dialog finishes its enter animation
      const focusTimer = window.setTimeout(() => modalCloseButtonRef.current?.focus(), 220);

      return () => {
        document.removeEventListener("keydown", onKey);
        window.clearTimeout(focusTimer);
        if (modalCloseTimeoutRef.current) {
          window.clearTimeout(modalCloseTimeoutRef.current);
          modalCloseTimeoutRef.current = null;
        }
      };
    }
  }, [selectedIdea]);

  // Fetch related ideas when selectedIdea changes
  useEffect(() => {
    if (selectedIdea !== null && results[selectedIdea]) {
      fetchRelatedIdeas(results[selectedIdea].has_parent);
    }
  }, [selectedIdea, results]);

  useEffect(() => {
    if (selectedLatestIdea !== null) {
      setModalActive(true);

      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") closeModal();
      };
      document.addEventListener("keydown", onKey);

      // focus the close button after the dialog finishes its enter animation
      const focusTimer = window.setTimeout(() => modalCloseButtonRef.current?.focus(), 220);

      return () => {
        document.removeEventListener("keydown", onKey);
        window.clearTimeout(focusTimer);
        if (modalCloseTimeoutRef.current) {
          window.clearTimeout(modalCloseTimeoutRef.current);
          modalCloseTimeoutRef.current = null;
        }
      };
    }
  }, [selectedLatestIdea]);
  
  useEffect(() => {
    if (results && results.length > 0) {
      setNoResult(false);
    } else {
      setNoResult(true);
    }
  }, [results]);

  function openMergeConfirmation() {
    setConfirmMerge(true);
    setConfirmMergeModalActive(true);
  }

  function closeMergeConfirmation() {
    setConfirmMergeModalActive(false);
    setTimeout(() => setConfirmMerge(false), 200);
  }

  async function handleMergeIdea() {
    if (selectedIdea === null || !results[selectedIdea]) return;
    
    setMergeLoading(true);
    try {
      const idea = results[selectedIdea];
      const MERGE_WEBHOOK_URL = process.env.NEXT_PUBLIC_MERGE_WEBHOOK_URL || "http://localhost:5678/webhook/4d26e1c1-e04e-4929-8806-77eb25fef8c0";
      
      const response = await fetch(MERGE_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pageContent: idea.pageContent,
          categories: idea.categories,
          created_at: idea.created_at,
          score: idea.score,
          vector_uuid: idea.vector_uuid,
          has_parent: idea.has_parent || null,
          text_uuid: idea.text_uuid,
          input_text: text,
        }),
      });

      const data = await response.json();

      if (response.ok && data) {
        // Close modal and reset form immediately
        closeModal();
        setText("");
        setSelectedCategories([]);
        setFileName("");
        setResults([]);
        setShowResults(false);
        setSelectedIdea(null);
        if (fileInputRef.current) {
          try {
            (fileInputRef.current as HTMLInputElement).value = "";
          } catch {}
        }
        
        // Refresh latest ideas
        await fetchLatestIdeas();
        
        // Show success message after reset
        setSuccessMessage("Idea merged successfully!");
      } else {
        setErrorMessage("Failed to merge idea. Please try again.");
      }
    } catch (err) {
      console.error("Merge error:", err);
      setErrorMessage("Error merging idea. Please try again.");
    } finally {
      setMergeLoading(false);
    }
  }

  async function handleSaveIdea() {
    setSaveLoading(true);
    try {
      const SAVE_WEBHOOK_URL = process.env.NEXT_PUBLIC_SAVE_WEBHOOK_URL || "http://localhost:5678/webhook/3148e0b0-2a54-480e-8bfd-451a4143b334";
      
      const response = await fetch(SAVE_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_text: text,
          categories: selectedCategories.length > 0 ? selectedCategories.join(", ") : null,
        }),
      });

      const data = await response.json();

      if (response.ok && data) {
        // Wait for latest ideas to be fetched before showing success
        await fetchLatestIdeas();
        
        setSuccessMessage("Idea saved successfully!");
        setTimeout(() => {
          // Reset everything to initial state
          setText("");
          setSelectedCategories([]);
          setFileName("");
          setResults([]);
          setShowResults(false);
          if (fileInputRef.current) {
            try {
              (fileInputRef.current as HTMLInputElement).value = "";
            } catch {}
          }
        }, 1500);
      } else {
        setErrorMessage("Failed to save idea. Please try again.");
      }
    } catch (err) {
      console.error("Save error:", err);
      setErrorMessage("Error saving idea. Please try again.");
    } finally {
      setSaveLoading(false);
    }
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

      <div className="flex flex-col items-center mb-8">
        <img src="/assets/star-logo.png" alt="Star" width={72} height={72} className="mb-4" />
        <h1 className="text-gray-700 text-5xl font-bold mb-2">What is your idea?</h1>
        <p className="text-gray-500 text-base mt-2">Help us shape the future of our products</p>
      </div>

      <div className="max-w-3xl ml-auto mr-auto flex flex-col gap-2 w-full">
        <div className="w-full">
          <MultiSelect
            options={categories}
            selected={selectedCategories}
            onChange={setSelectedCategories}
            placeholder="Select a product..."
          />
        </div>
      
        <div className="flex flex-col justify-between soft-input mt-6 h-56 w-full pl-6 pr-6 border border-white border-solid rounded-2xl shadow-sm py-5 px-4 transition-all duration-300 hover:shadow-md hover:bg-transparent focus:outline-none focus:ring-2 focus:ring-color-green-primary ">
          
          <div className="soft-input-top flex flex-col w-full">
            <textarea
              id="input_full_text" 
              name="full_text"
              placeholder="Explain your idea here..." 
              className="text-lg text-gray-700 w-full textareaHideScroll border-0 focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none placeholder-gray-600 "
              maxLength={200}
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={inputMode === "upload"}
            />
          </div>
          <div className="flex flex-row justify-end w-full items-center gap-4">
            <div id="uploaded-file-box" className={`w-10/12 flex flex-row gap-3 items-center ${inputMode === "type" ? 'hidden' : ''}`}>
              <input ref={fileInputRef} name="full_document" type="file" className="w-full hidden" id="input_full_document" onChange={(e) => {
                const files = (e.target as HTMLInputElement).files;
                const file = files?.[0] ?? null;
                if (file) setFileName(file.name);
              }}/>
              <label className="bg-gray-300 text-lg text-gray-600 cursor-pointer p-2 rounded-lg block w-fit h-fit" htmlFor="input_full_document">
                <FaPlus />
              </label>
              {fileName && (
                <div className="flex items-center gap-2">
                  <p className="fileName">Attached: {fileName}</p>
                  <button
                    type="button"
                    aria-label="Remove file"
                    className="text-gray-600 hover:text-gray-700 p-1 cursor-pointer"
                    onClick={() => {
                      setFileName("");
                      if (fileInputRef.current) {
                        try {
                          (fileInputRef.current as HTMLInputElement).value = "";
                        } catch {}
                      }
                    }}
                  >
                    <FiX size={18} />
                  </button>
                </div>
              )}
            </div>
            {inputMode === "type" && (
              <div>&nbsp;</div>
            )}
            <div className="text-xs text-gray-400 text-right mt-1">{text.length} / 200</div>
            <button
              onClick={handleSubmit}
              disabled={loading || (!text && !fileName)}
              className={`${
                text || fileName
                  ? 'bg-color-primary-green text-white hover:opacity-90 cursor-pointer'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              } text-lg p-3 rounded-xl transition-all duration-200 transform hover:scale-105 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label="Submit Idea"
            >
              <FaArrowUp />
            </button>
          </div>
        </div>
      </div>


      

      {loading ? (
        <div className="w-full max-w-3xl mt-8 text-center text-gray-700 mr-auto ml-auto" role="status" aria-live="polite">
          <div className="inline-flex items-center gap-3 justify-center">
            <svg className="w-6 h-6 text-color-primary animate-spin" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span>Processing your data…</span>
          </div>
        </div>
      ) : showResults && results && results.length > 0 ? (
        <>
          <div className="w-full max-w-3xl mt-12 mr-auto ml-auto">
            <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-xl transition-all duration-300 hover:shadow-md text-center">
              <p className="text-sm text-gray-700 mb-4 font-medium">Prefer to save this as a new idea instead of merging with an existing one?</p>
              <button
                onClick={handleSaveIdea}
                disabled={saveLoading}
                className={`cursor-pointer px-5 py-2.5 bg-color-primary-green text-white text-sm font-medium rounded-lg transition-all duration-200 hover:opacity-90 ${saveLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {saveLoading ? 'Saving...' : 'Save as New Idea'}
              </button>
            </div>
            <h3 className="text-2xl font-bold text-gray-700 mb-6 uppercase tracking-wide">Recent Ideas</h3>
          </div>

          <div id="ideas-list" className="w-full max-w-3xl mr-auto ml-auto">

            {getLatestByParent(results).map((r, idx) => (
              <IdeaItem
                key={r.pageContent ? `${idx}-${r.pageContent.slice(0, 20)}` : idx}
                itemId={results.indexOf(r)}
                title={truncateText(r.pageContent, 70)}
                percentage={r.score ?? 0}
                date={formatDate(r.created_at)}
                onClick={() => setSelectedIdea(results.indexOf(r))}
              />
            ))}

          </div>

          {/* Modal for showing full idea */}
          {selectedIdea !== null && results[selectedIdea] && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className={`absolute inset-0 bg-black transition-opacity duration-200 ${modalActive ? 'opacity-50' : 'opacity-0 pointer-events-none'}`}
                onClick={closeModal}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-hidden={!modalActive}
                aria-labelledby="idea-modal-title"
                className={`relative bg-white rounded-lg p-6 max-w-2xl w-full max-h-150 overflow-y-auto shadow-lg z-10 transform transition-all duration-200 ${modalActive ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-2 scale-95 pointer-events-none'}`}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h3 id="idea-modal-title" className="text-lg font-semibold">Idea</h3>
                  {results[selectedIdea].merge && <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded whitespace-nowrap">Merged</span>}
                </div>
                
                {/* Current Content */}
                <div className="mb-6">
                  <p className="text-sm font-semibold text-gray-600 mb-2">Voice of the Customer:</p>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-100 p-3 rounded">{results[selectedIdea].pageContent}</div>
                  {results[selectedIdea].categories && <div className="text-xs text-gray-600 mt-2">Products: {results[selectedIdea].categories}</div>}
                  <div className="text-xs text-gray-500 mt-2">{formatDate(results[selectedIdea].created_at)}</div>
                </div>
                
                {/* History - List all related ideas excluding current */}
                {relatedIdeas.filter(idea => idea.uuid !== results[selectedIdea]?.vector_uuid).length > 0 && (
                  <div className="mb-6">
                    <p className="text-sm font-semibold text-gray-600 mb-3">History:</p>
                    {relatedIdeasLoading ? (
                      <p className="text-xs text-gray-500">Loading history...</p>
                    ) : (
                      <div className="space-y-3">
                        {relatedIdeas.filter(idea => idea.uuid !== results[selectedIdea]?.vector_uuid).map((idea, idx) => (
                            <div key={idx} className="border-l-2 border-gray-300 pl-3 py-2">
                              <div className="text-sm text-gray-700">{idea.full_text}</div>
                              <div className="text-xs text-gray-500 mt-1">{formatDate(idea.created_at)}</div>
                            </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex gap-2 justify-end">
                  <button 
                    onClick={openMergeConfirmation} 
                    disabled={mergeLoading}
                    className={`mr-1 cursor-pointer px-4 py-2 bg-color-primary-green text-white rounded hover:opacity-90 ${mergeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {mergeLoading ? 'Merging...' : 'Merge'}
                  </button>
                  <button ref={modalCloseButtonRef} onClick={closeModal} className="px-4 py-2 bg-gray-500 text-white rounded cursor-pointer">Close</button>
                </div>
              </div>
            </div>
          )}

        </>
      ) : showResults && noResult ? (
        <div className="w-full max-w-3xl mt-12 mr-auto ml-auto">
          <div className="p-8 bg-green-50 border border-green-200 rounded-xl transition-all duration-300 hover:shadow-md text-center">
            <p className="text-gray-700 mb-5 text-lg font-medium">🎉 Your idea is new! Would you like to save it?</p>
            <button
              onClick={handleSaveIdea}
              disabled={saveLoading}
              className={`cursor-pointer px-6 py-3 bg-color-primary-green text-white text-sm font-medium rounded-lg transition-all duration-200 hover:opacity-90 ${saveLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {saveLoading ? 'Saving...' : 'Save Idea'}
            </button>
          </div>
        </div>
      ) : !showResults && latestIdeas.length > 0 ? (
          <>
            <div className="w-full max-w-3xl mt-12 mb-6 flex justify-between items-center mr-auto ml-auto">
              <h3 className="text-2xl font-bold text-gray-700 uppercase tracking-wide">Latest Ideas</h3>
              <a 
                href="/ideas"
                className="group px-5 py-2.5 text-color-green-uno text-sm font-medium rounded-lg hover:opacity-90 transition-all duration-200 flex items-center gap-2"
              >
                <span>Show All</span>
                <FiArrowRight className="transition-transform duration-200 group-hover:-translate-x-1" />
              </a>
            </div>

            <div id="latest-ideas-list" className="w-full max-w-3xl ml-auto mr-auto">

              {latestIdeas.map((r, idx) => (
                <IdeaItem
                  key={r.full_text ? `latest-${idx}-${r.full_text.slice(0, 20)}` : `latest-${idx}`}
                  itemId={idx}
                  title={truncateText(r.full_text, 70)}
                  percentage={0}
                  date={formatDate(r.created_at)}
                  onClick={() => setSelectedLatestIdea(idx)}
                  isLatest={true}
                />
              ))}

            </div>

            {/* Modal for showing full latest idea */}
            {selectedLatestIdea !== null && latestIdeas[selectedLatestIdea] && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div
                  className={`absolute inset-0 bg-gray-500 transition-opacity duration-200 ${modalActive ? 'opacity-50' : 'opacity-0 pointer-events-none'}`}
                  onClick={closeModal}
                />
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-hidden={!modalActive}
                  aria-labelledby="idea-modal-title"
                  className={`relative bg-white rounded-lg p-6 max-w-2xl w-full max-h-150 overflow-y-auto shadow-lg z-10 transform transition-all duration-200 ${modalActive ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-2 scale-95 pointer-events-none'}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <h3 id="idea-modal-title" className="text-lg font-semibold">Idea</h3>
                    {latestIdeas[selectedLatestIdea].merged && <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded whitespace-nowrap">Merged</span>}
                  </div>
                  
                  {/* Current Content */}
                  <div className="mb-6">
                    <p className="text-sm font-semibold text-gray-600 mb-2">Voice of the Customer:</p>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-200 p-3 rounded">{latestIdeas[selectedLatestIdea].full_text}</div>
                    {latestIdeas[selectedLatestIdea].categories && <div className="text-xs text-gray-600 mt-2">Products: {latestIdeas[selectedLatestIdea].categories}</div>}
                    <div className="text-xs text-gray-500 mt-2">{formatDate(latestIdeas[selectedLatestIdea].created_at)}</div>
                  </div>
                  
                  {/* History - List all related ideas excluding current */}
                  {relatedIdeas.filter(idea => idea.uuid !== latestIdeas[selectedLatestIdea]?.uuid).length > 0 && (
                    <div className="mb-6">
                      <p className="text-sm font-semibold text-gray-600 mb-3">History:</p>
                      {relatedIdeasLoading ? (
                        <p className="text-xs text-gray-500">Loading history...</p>
                      ) : (
                        <div className="space-y-3">
                          {relatedIdeas.filter(idea => idea.uuid !== latestIdeas[selectedLatestIdea]?.uuid).map((idea, idx) => (
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
                    <button ref={modalCloseButtonRef} onClick={closeModal} className="px-4 py-2 bg-gray-500 text-white rounded cursor-pointer">Close</button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null
      }

      

      {/* Merge confirmation modal */}
      {confirmMerge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className={`absolute inset-0 bg-black transition-opacity duration-200 ${confirmMergeModalActive ? 'opacity-50' : 'opacity-0 pointer-events-none'}`}
            onClick={closeMergeConfirmation}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-hidden={!confirmMergeModalActive}
            className={`relative bg-white rounded-lg p-6 max-w-md w-full shadow-lg transform transition-all duration-200 ${confirmMergeModalActive ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-2 scale-95 pointer-events-none'}`}
          >
            <h3 className="text-lg font-semibold mb-4">Confirm Merge</h3>
            <p className="text-sm text-gray-700 mb-6">Are you sure you want to merge this idea?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={closeMergeConfirmation}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:opacity-90 cursor-pointer"
              >
                No
              </button>
              <button
                onClick={() => {
                  closeMergeConfirmation();
                  handleMergeIdea();
                }}
                className="px-4 py-2 bg-color-primary-green text-white rounded hover:opacity-90 cursor-pointer"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Error modal */}
        {errorMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className={`absolute inset-0 bg-black transition-opacity duration-200 ${errorModalActive ? 'opacity-50' : 'opacity-0 pointer-events-none'}`}
              onClick={closeError}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-hidden={!errorModalActive}
              className={`relative bg-white rounded-lg p-6 max-w-md w-full shadow-lg transform transition-all duration-200 ${errorModalActive ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-2 scale-95 pointer-events-none'}`}
            >
              <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
              <p className="text-sm text-gray-700 mb-4">{errorMessage}</p>
              <div className="text-right">
                <button onClick={closeError} className="px-4 py-2 bg-color-primary-green text-white rounded cursor-pointer">OK</button>
              </div>
            </div>
          </div>
        )}

        {/* Success modal */}
        {successMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className={`absolute inset-0 bg-black transition-opacity duration-200 ${successModalActive ? 'opacity-50' : 'opacity-0 pointer-events-none'}`}
              onClick={closeSuccess}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-hidden={!successModalActive}
              className={`relative bg-white rounded-lg p-6 max-w-md w-full shadow-lg transform transition-all duration-200 ${successModalActive ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-2 scale-95 pointer-events-none'}`}
            >
              <h3 className="text-lg font-semibold mb-2 text-color-green-uno">Success</h3>
              <p className="text-sm text-gray-700 mb-4">{successMessage}</p>
              <div className="text-right">
                <button onClick={closeSuccess} className={`cursor-pointer px-5 py-2.5 bg-color-primary-green text-white text-sm font-medium rounded-lg transition-all duration-200 hover:opacity-90 `}>OK</button>
              </div>
            </div>
          </div>
        )}

        <div className="footer text-center text-gray-400 text-xs bottom-4 w-full mt-[100px]">
          &copy; {new Date().getFullYear()} JWay Group. All rights reserved. Voice of the Customer.
        </div>
    </main>
  );
}
