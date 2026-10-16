"use client";
import { createElement, useRef, useEffect } from "react";
import { mount } from "../index.js";

export function Lucid({ app, props, as = "div", className, ...rest }) {
  const ref = useRef(null);
  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof app !== "function") return;
    return mount(() => app(latest.current ?? {}), element);
  }, [app]);
  return createElement(as, {
    ...rest,
    ref,
    className: className ? `lucid-app ${className}` : "lucid-app",
    suppressHydrationWarning: true
  });
}
