import { useCallback, useEffect, useState } from 'react';

interface ResizeHandleProps {
  side: 'left' | 'right';
  onResize: (delta: number) => void;
}

export default function ResizeHandle({ side, onResize }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const adjustedDelta = side === 'left' ? delta : -delta;
      onResize(adjustedDelta);
      setStartX(e.clientX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, startX, side, onResize]);

  return (
    <div
      className={`w-1 cursor-col-resize hover:bg-blue-400 transition-colors ${
        isDragging ? 'bg-blue-500' : 'bg-transparent hover:bg-blue-300'
      }`}
      onMouseDown={handleMouseDown}
    />
  );
}
