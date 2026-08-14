/* ==========================================================
   SHARED CONFIG
   Loaded once, before every other script, as a plain global
   script (not a module) so both sidebar.js and the view
   modules can read window.API_URL without each of them
   re-declaring it (that used to throw "already declared"
   errors when both HTML pages' inline scripts were merged
   into one document).
   ========================================================== */
window.API_URL = "https://me-connect-api.mech-elec-ranhill.workers.dev";
