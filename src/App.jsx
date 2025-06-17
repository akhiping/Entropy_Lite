import { useStickyStore } from './store';
import Minimap from './Minimap';
import { motion, AnimatePresence } from 'framer-motion';

const App = () => {
  const { stickies } = useStickyStore();

  return (
    <div className="relative min-h-screen bg-gray-50">
      <button
        className="fixed bottom-8 right-8 bg-green-700 text-white px-6 py-3 rounded-full shadow-lg hover:bg-green-800 transition"
        onClick={() => {
          const id = `sticky_${Date.now()}`;
          const newSticky = {
            id,
            title: 'New Sticky',
            color: '#14532d',
            content: { context: 'Type your idea here...' },
          };
          useStickyStore.getState().addSticky(newSticky);
        }}
      >
        + New Sticky
      </button>
      <div className="sticky-notes flex flex-wrap gap-4 p-8">
        <AnimatePresence>
          {stickies.map(sticky => (
            <motion.div
              key={sticky.id}
              data-id={sticky.id}
              className="sticky-note rounded-lg shadow-lg p-4 min-w-[220px] max-w-xs bg-white/80 border border-gray-200 hover:shadow-xl transition-all duration-200"
              style={{ background: sticky.color }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              layout
            >
              <h3 className="font-bold text-lg mb-1 truncate">{sticky.title}</h3>
              <p className="text-gray-700 text-sm break-words">{sticky.content.context}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <Minimap />
    </div>
  );
};

export default App; 