'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Info } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

export default function BezierCurveTool() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<Point[]>([
    { x: 100, y: 300 },
    { x: 200, y: 100 },
    { x: 400, y: 100 },
    { x: 500, y: 300 }
  ]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [subdivisions, setSubdivisions] = useState<number>(50);
  const [showConstruction, setShowConstruction] = useState<boolean>(false);
  const [animationT, setAnimationT] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  // De Casteljau algorithm
  const deCasteljau = (points: Point[], t: number): Point => {
    if (points.length === 1) return points[0];
    
    const newPoints: Point[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      newPoints.push({
        x: (1 - t) * points[i].x + t * points[i + 1].x,
        y: (1 - t) * points[i].y + t * points[i + 1].y
      });
    }
    return deCasteljau(newPoints, t);
  };

  // Get all intermediate points for construction
  const deCasteljauConstruction = (points: Point[], t: number): Point[][] => {
    const levels: Point[][] = [points];
    let currentPoints = points;
    
    while (currentPoints.length > 1) {
      const newPoints: Point[] = [];
      for (let i = 0; i < currentPoints.length - 1; i++) {
        newPoints.push({
          x: (1 - t) * currentPoints[i].x + t * currentPoints[i + 1].x,
          y: (1 - t) * currentPoints[i].y + t * currentPoints[i + 1].y
        });
      }
      levels.push(newPoints);
      currentPoints = newPoints;
    }
    return levels;
  };

  // Generate curve using subdivision
  const generateBezierCurve = (controlPoints: Point[], numSubdivisions: number): Point[] => {
    const curvePoints: Point[] = [];
    for (let i = 0; i <= numSubdivisions; i++) {
      const t = i / numSubdivisions;
      curvePoints.push(deCasteljau(controlPoints, t));
    }
    return curvePoints;
  };

  // Draw everything on canvas
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    if (points.length < 2) return;

    // Draw control polygon
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Bézier curve
    const curvePoints = generateBezierCurve(points, subdivisions);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(curvePoints[0].x, curvePoints[0].y);
    for (let i = 1; i < curvePoints.length; i++) {
      ctx.lineTo(curvePoints[i].x, curvePoints[i].y);
    }
    ctx.stroke();

    // Draw construction lines
    if (showConstruction && points.length > 1) {
      const t = isAnimating ? animationT : 0.5;
      const levels = deCasteljauConstruction(points, t);
      
      const colors = ['#f97316', '#84cc16', '#06b6d4', '#a855f7', '#ec4899'];
      
      for (let level = 0; level < levels.length - 1; level++) {
        const currentLevel = levels[level];
        const color = colors[level % colors.length];
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(currentLevel[0].x, currentLevel[0].y);
        for (let i = 1; i < currentLevel.length; i++) {
          ctx.lineTo(currentLevel[i].x, currentLevel[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = color;
        for (let i = 0; i < currentLevel.length; i++) {
          ctx.beginPath();
          ctx.arc(currentLevel[i].x, currentLevel[i].y, 4, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
      
      const finalPoint = levels[levels.length - 1][0];
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(finalPoint.x, finalPoint.y, 6, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Draw control points
    points.forEach((point, index) => {
      const isHovered = hoveredIndex === index;
      const isDragging = draggingIndex === index;
      
      ctx.fillStyle = isDragging ? '#ef4444' : isHovered ? '#3b82f6' : '#1e293b';
      ctx.beginPath();
      ctx.arc(point.x, point.y, isDragging ? 10 : isHovered ? 8 : 6, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.fillStyle = '#1e293b';
      ctx.font = '12px sans-serif';
      ctx.fillText(`P${index}`, point.x + 10, point.y - 10);
    });
  };

  useEffect(() => {
    draw();
  }, [points, subdivisions, showConstruction, animationT, hoveredIndex, draggingIndex]);

  useEffect(() => {
    if (isAnimating) {
      const interval = setInterval(() => {
        setAnimationT(prev => {
          const next = prev + 0.01;
          if (next > 1) {
            setIsAnimating(false);
            return 0;
          }
          return next;
        });
      }, 30);
      return () => clearInterval(interval);
    }
  }, [isAnimating]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const findPointIndex = (pos: Point): number => {
    for (let i = 0; i < points.length; i++) {
      const dx = pos.x - points[i].x;
      const dy = pos.y - points[i].y;
      if (Math.sqrt(dx * dx + dy * dy) < 15) {
        return i;
      }
    }
    return -1;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    const index = findPointIndex(pos);
    if (index !== -1) {
      setDraggingIndex(index);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    if (draggingIndex !== null) {
      const newPoints = [...points];
      newPoints[draggingIndex] = pos;
      setPoints(newPoints);
    } else {
      const index = findPointIndex(pos);
      setHoveredIndex(index);
    }
  };

  const handleMouseUp = () => {
    setDraggingIndex(null);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingIndex === null) {
      const pos = getMousePos(e);
      setPoints([...points, pos]);
    }
  };

  const removePoint = (index: number) => {
    if (points.length > 2) {
      setPoints(points.filter((_, i) => i !== index));
    }
  };

  const clearAll = () => {
    setPoints([
      { x: 100, y: 300 },
      { x: 200, y: 100 },
      { x: 400, y: 100 },
      { x: 500, y: 300 }
    ]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Interactive Bézier Curve Design Tool
          </h1>
          <p className="text-slate-600">
            De Casteljau Algorithm Implementation - MATH 583 Project 1
          </p>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 bg-white rounded-lg shadow-lg p-4">
            <canvas
              ref={canvasRef}
              width={900}
              height={600}
              className="border-2 border-slate-200 rounded cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onDoubleClick={handleDoubleClick}
            />
          </div>

          <div className="w-80 bg-white rounded-lg shadow-lg p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-3">Controls</h2>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Subdivisions: {subdivisions}
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={subdivisions}
                    onChange={(e) => setSubdivisions(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="construction"
                    checked={showConstruction}
                    onChange={(e) => setShowConstruction(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="construction" className="text-sm text-slate-700">
                    Show Construction Lines
                  </label>
                </div>

                <button
                  onClick={() => setIsAnimating(!isAnimating)}
                  disabled={!showConstruction}
                  className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-slate-300 transition"
                >
                  {isAnimating ? 'Stop Animation' : 'Animate Construction'}
                </button>

                <button
                  onClick={clearAll}
                  className="w-full py-2 px-4 bg-slate-500 text-white rounded hover:bg-slate-600 transition"
                >
                  Reset to Default
                </button>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-3">
                Control Points ({points.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {points.map((point, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded"
                  >
                    <span className="text-sm text-slate-700">
                      P{index}: ({Math.round(point.x)}, {Math.round(point.y)})
                    </span>
                    <button
                      onClick={() => removePoint(index)}
                      disabled={points.length <= 2}
                      className="text-red-500 hover:text-red-700 disabled:text-slate-300"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-start gap-2 text-sm text-slate-600">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Instructions:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Drag control points to move them</li>
                    <li>• Double-click to add new points</li>
                    <li>• Click trash icon to remove points</li>
                    <li>• Enable construction lines to see the algorithm</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}