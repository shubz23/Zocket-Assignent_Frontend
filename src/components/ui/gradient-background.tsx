import React from 'react';

export function GradientBackground() {
  return (
    <div className="relative w-full h-full overflow-hidden">
      <div 
        className="absolute inset-0 bg-gradient-to-br from-pink-500 via-pink-600 to-purple-800 animate-gradient"
        style={{
          backgroundSize: '200% 200%',
          animation: 'gradient 15s ease infinite',
        }}
      />
      <style jsx>{`
        @keyframes gradient {
          0% { background-position: 0% 50% }
          50% { background-position: 100% 50% }
          100% { background-position: 0% 50% }
        }
      `}</style>
    </div>
  );
} 