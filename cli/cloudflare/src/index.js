/**
 * apiz-cli — tiny Cloudflare Worker.
 *
 * Routes:
 *   GET /cli                         → install.sh (text/x-shellscript, no cache)
 *   GET /cli/install.sh              → same as above
 *   GET /cli/<path>                  → R2 bucket apiz-cli at <path>
 *
 * The bucket layout (populated by sdk/cli/scripts/deploy_cli_to_r2.py):
 *
 *   install.sh
 *   latest/
 *     VERSION                        ← plain-text "v0.1.0\n"
 *     apiz_0.1.0_darwin_amd64.tar.gz
 *     apiz_0.1.0_darwin_arm64.tar.gz
 *     apiz_0.1.0_linux_amd64.tar.gz
 *     apiz_0.1.0_linux_arm64.tar.gz
 *     apiz_0.1.0_windows_amd64.zip
 *     apiz_0.1.0_windows_arm64.zip
 *     checksums.txt
 *   v0.1.0/
 *     ...same archives...
 */

const MIME = {
  sh: "text/x-shellscript; charset=UTF-8",
  txt: "text/plain; charset=UTF-8",
  json: "application/json",
  "tar.gz": "application/gzip",
  tgz: "application/gzip",
  zip: "application/zip",
};

function contentTypeFor(key) {
  if (key.endsWith("install.sh") || key === "install.sh") return MIME.sh;
  if (key.endsWith(".tar.gz")) return MIME["tar.gz"];
  if (key.endsWith(".tgz")) return MIME.tgz;
  if (key.endsWith(".zip")) return MIME.zip;
  if (key === "VERSION" || key.endsWith("/VERSION")) return MIME.txt;
  if (key.endsWith(".txt")) return MIME.txt;
  if (key.endsWith(".json")) return MIME.json;
  return "application/octet-stream";
}

function cacheControlFor(key) {
  // install.sh and VERSION sentinel must never cache (we ship updates here).
  if (key === "install.sh" || key === "VERSION" || key.endsWith("/VERSION")) {
    return "no-cache, no-store, must-revalidate";
  }
  // Versioned archives are immutable.
  if (/^v\d/.test(key)) {
    return "public, max-age=31536000, immutable";
  }
  // latest/* changes per release; short cache so users get new versions soon.
  if (key.startsWith("latest/")) {
    return "public, max-age=300";
  }
  return "public, max-age=3600";
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let path = url.pathname;

    // Strip leading /cli (with or without trailing pieces).
    if (path === "/cli" || path === "/cli/") {
      path = "/install.sh";
    } else if (path.startsWith("/cli/")) {
      path = path.slice("/cli".length); // keep leading "/"
    } else {
      // Defensive fallback: any other route reaching this worker is a misconfig.
      return new Response("Not Found", { status: 404 });
    }

    const key = path.replace(/^\/+/, "");
    if (!key) {
      return new Response("Not Found", { status: 404 });
    }

    const object = await env.BUCKET.get(key);
    if (!object || !object.body) {
      return new Response(`Not Found: ${key}\n`, {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=UTF-8" },
      });
    }

    const headers = new Headers();
    headers.set("Content-Type", contentTypeFor(key));
    headers.set("Cache-Control", cacheControlFor(key));
    headers.set("ETag", object.httpEtag);
    headers.set("Access-Control-Allow-Origin", "*");
    object.writeHttpMetadata(headers);
    return new Response(object.body, { headers });
  },
};
