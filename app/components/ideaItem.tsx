"use client";
type IdeaItemProps = {
  itemId?: number | string;
  title: string;
  percentage: number;
  date: string;
  onClick: () => void;
  isLatest?: boolean;
};

export default function IdeaItem({ itemId, title, percentage, date, onClick, isLatest }: IdeaItemProps) {



  // const thePercentage = Math.round(((percentage + 1) / 2) * 100);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open idea: ${title}`}
      className="idea-item flex flex-row justify-left pl-6 pr-6 border border-white border-solid rounded-xl py-5 px-4 mt-4 cursor-pointer text-left w-full transition-all duration-200 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]"
    >
      <h3 className="mr-auto text-gray-700 font-medium">{title}</h3>
      {!isLatest && <div className="idea-item-percentage w-10 text-color-green-uno text-2xl flex flex-col items-center mr-6">
        <div>{percentage}%</div>
        <div className="text-xs">Similarity</div>
      </div>}
      <div className="idea-item-date w-20 text-right text-gray-500 text-sm">{date}</div>
    </button>
  );
} 