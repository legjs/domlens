import "~src/style.css"
import useInspectorStore from "~src/store"

function IndexPopup() {
  const { isEnabled, toggleInspector } = useInspectorStore()

  return (
    <div className="flex flex-col w-[360px] min-h-[200px] bg-inspector-bg text-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-inspector-border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-inspector-primary shadow-[0_0_8px_rgba(0,255,255,0.5)]" />
          <h1 className="text-sm font-semibold text-white">
            AI Runtime Inspector
          </h1>
        </div>
        <span className="text-xs text-gray-500">v0.1.0</span>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center flex-1 px-4 py-6 gap-4">
        {/* Inspector Toggle */}
        <button
          onClick={toggleInspector}
          className={`
            relative flex items-center gap-2 px-6 py-2.5 rounded-lg
            text-sm font-medium transition-all duration-200
            border cursor-pointer
            ${
              isEnabled
                ? "bg-inspector-primary/10 border-inspector-primary text-inspector-primary shadow-[0_0_15px_rgba(0,255,255,0.15)]"
                : "bg-inspector-surface border-inspector-border text-gray-400 hover:border-gray-500 hover:text-gray-300"
            }
          `}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isEnabled ? "bg-inspector-primary animate-pulse" : "bg-gray-500"
            }`}
          />
          {isEnabled ? "Inspector Active" : "Enable Inspector"}
        </button>

        {/* Status */}
        <p className="text-xs text-gray-500 text-center">
          {isEnabled
            ? "Click any element on the page to inspect its runtime context"
            : "Enable the inspector to start analyzing DOM elements"}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center px-4 py-2 border-t border-inspector-border">
        <span className="text-[10px] text-gray-600">
          Powered by Plasmo + React + Tailwind
        </span>
      </div>
    </div>
  )
}

export default IndexPopup
