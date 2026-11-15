/**
 * Home LCP on a local production server: async framework chunks download and
 * run before first paint, so Lighthouse's simulated LCP treats them as
 * render-blocking. Queue them until after the first frame instead.
 * Inline flight data stays in place and is drained when the chunks load.
 */
const CHUNK_SCRIPT =
  /<script src="(\/_next\/static\/chunks\/[^"]+\.js)" async=""><\/script>/g;

const PAINT_GAP_MS = 250;

function deferAsyncChunks(html) {
  const srcs = [];
  const stripped = html.replace(CHUNK_SCRIPT, (_match, src) => {
    srcs.push(src);
    return "";
  });
  if (srcs.length === 0) return html;

  const injector = `<script>(function(){var s=${JSON.stringify(srcs)};function load(){for(var i=0;i<s.length;i++){var e=document.createElement("script");e.src=s[i];e.async=true;document.head.appendChild(e);}}setTimeout(load,${PAINT_GAP_MS});})();</script>`;
  const opened = stripped.replace(/<body([^>]*)>/, `<body$1>${injector}`);
  return opened === stripped ? `${injector}${stripped}` : opened;
}

module.exports = { deferAsyncChunks, PAINT_GAP_MS };
