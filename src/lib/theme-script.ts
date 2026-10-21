// Shared by the server layout and the client theme hook, so it must stay free of "use client".

export const THEME_STORAGE_KEY = "outlr-theme";

// Public pages keep their own design whatever the dashboard theme is.
export const THEMELESS_PATHS = ["/login", "/welcome", "/onboarding"];

/** Inline script for <head>: applies the saved theme before first paint. */
export const themeInitScript = `(function(){try{var skip=${JSON.stringify(
  THEMELESS_PATHS
)}.indexOf(location.pathname)!==-1;if(!skip&&localStorage.getItem("${THEME_STORAGE_KEY}")==="dark"){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}}catch(e){}})();`;
