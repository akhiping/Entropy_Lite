import { useEffect, useRef } from 'preact/hooks';
import cytoscape from 'cytoscape';
import { useStickyStore } from './store';
import { motion } from 'framer-motion';

const Minimap = () => {
  const containerRef = useRef(null);
  const { stickies } = useStickyStore();

  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: stickies.map(sticky => ({
        data: { id: sticky.id, label: sticky.title, color: sticky.color },
      })),
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': '#fff',
            'font-size': 10,
            'width': 24,
            'height': 24,
            'border-width': 2,
            'border-color': '#fff',
            'text-outline-width': 2,
            'text-outline-color': '#2226',
          },
        },
      ],
      layout: {
        name: 'grid',
        fit: true,
        padding: 10,
      },
      userZoomingEnabled: false,
      userPanningEnabled: false,
      boxSelectionEnabled: false,
    });

    cy.on('tap', 'node', function(evt) {
      const node = evt.target;
      const stickyElement = document.querySelector(`[data-id="${node.id()}"]`);
      if (stickyElement) {
        stickyElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    return () => {
      cy.destroy();
    };
  }, [stickies]);

  return (
    <motion.div
      className="fixed top-4 right-4 z-50 bg-black/40 rounded-lg shadow-lg p-2 backdrop-blur-sm border border-white/20"
      style={{ width: 160, height: 160 }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </motion.div>
  );
};

export default Minimap; 