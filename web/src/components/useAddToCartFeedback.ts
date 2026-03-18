"use client";

import { useEffect, useRef, useState } from "react";

export const useAddToCartFeedback = (durationMs = 1600) => {
  const [isAdded, setIsAdded] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const clearFeedbackTimeout = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const showAddedFeedback = () => {
    clearFeedbackTimeout();
    setIsAdded(true);
    timeoutRef.current = window.setTimeout(() => {
      setIsAdded(false);
      timeoutRef.current = null;
    }, durationMs);
  };

  useEffect(() => clearFeedbackTimeout, []);

  return {
    isAdded,
    showAddedFeedback,
  };
};
