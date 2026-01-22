
import React, { useEffect, useRef, memo } from 'react';

// Since lottie-web is loaded from a script tag, we need to declare it globally
declare const lottie: any;

interface LottieAnimationProps {
  animationData: any;
  className?: string;
}

// Using React.memo to prevent unnecessary re-renders when parent state changes,
// which helps ensure the animation remains smooth.
export const LottieAnimation: React.FC<LottieAnimationProps> = memo(({ animationData, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<any>(null);

  useEffect(() => {
    // Ensure lottie is available and we have a container
    if (typeof lottie !== 'undefined' && containerRef.current) {
      // Destroy previous animation instance if it exists
      if (animRef.current) {
        animRef.current.destroy();
      }

      // Load new animation
      animRef.current = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: animationData,
      });
    }

    // Cleanup function to destroy animation on unmount
    return () => {
      if (animRef.current) {
        animRef.current.destroy();
        animRef.current = null;
      }
    };
  }, [animationData]); // Re-run effect only if animationData changes

  return <div ref={containerRef} className={className} />;
});
