import { createServer } from "node:http";
import { parse } from "node:url";
import zlib from "node:zlib";

import next from "next";

import { deferAsyncChunks } from "./defer-chunks.cjs";

// `pnpm start` must always serve the production build. Without this, an unset
// NODE_ENV makes Next boot in dev mode and Playwright hits broken hydration.
if (process.env.NODE_ENV !== "development") {
  process.env.NODE_ENV = "production";
}

const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOSTNAME || "0.0.0.0";
const dev = process.env.NODE_ENV === "development";
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

function pushChunk(chunks, chunk, encoding) {
  if (
    chunk === undefined ||
    chunk === null ||
    chunk === "" ||
    typeof chunk === "function"
  )
    return;
  chunks.push(
    Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk, typeof encoding === "string" ? encoding : "utf8"),
  );
}

function bufferHtml(req, res) {
  const chunks = [];
  const origWriteHead = res.writeHead.bind(res);
  const origEnd = res.end.bind(res);
  let statusCode = res.statusCode;
  let statusMessage = res.statusMessage;

  res.writeHead = function writeHead(status, reason, headers) {
    if (typeof status === "number") {
      statusCode = status;
      res.statusCode = status;
    }
    if (typeof reason === "string") statusMessage = reason;
    const bag =
      reason && typeof reason === "object"
        ? reason
        : headers && typeof headers === "object"
          ? headers
          : null;
    if (bag) {
      for (const [key, value] of Object.entries(bag)) res.setHeader(key, value);
    }
    return res;
  };

  res.write = function write(chunk, encoding, cb) {
    pushChunk(chunks, chunk, encoding);
    const done = typeof encoding === "function" ? encoding : cb;
    if (typeof done === "function") done();
    return true;
  };

  res.end = function end(chunk, encoding, cb) {
    if (typeof chunk === "function") {
      cb = chunk;
      chunk = undefined;
      encoding = undefined;
    } else if (typeof encoding === "function") {
      cb = encoding;
      encoding = undefined;
    }
    pushChunk(chunks, chunk, encoding);

    const finalStatus = res.statusCode || statusCode || 200;
    res.statusCode = finalStatus;
    if (statusMessage) res.statusMessage = statusMessage;
    if (finalStatus === 204 || finalStatus === 304) {
      res.removeHeader("content-encoding");
      res.removeHeader("content-length");
      res.removeHeader("transfer-encoding");
      if (!res.headersSent) origWriteHead(finalStatus);
      return cb ? origEnd(cb) : origEnd();
    }

    let body = Buffer.concat(chunks);
    const type = String(res.getHeader("content-type") || "");
    if (finalStatus === 200 && type.includes("text/html") && body.length > 0) {
      body = Buffer.from(deferAsyncChunks(body.toString("utf8")));
      const accept = String(req.headers["accept-encoding"] || "");
      if (accept.includes("gzip")) {
        body = zlib.gzipSync(body);
        res.setHeader("content-encoding", "gzip");
      } else {
        res.removeHeader("content-encoding");
      }
    }
    res.removeHeader("transfer-encoding");
    res.setHeader("content-length", body.length);
    if (!res.headersSent) origWriteHead(finalStatus);
    return origEnd(body, cb);
  };

  const parsed = parse(req.url || "/", true);
  handle(req, res, parsed).catch((error) => {
    console.error(error);
    if (!res.headersSent) {
      res.statusCode = 500;
      origWriteHead(500);
    }
    origEnd("Internal Server Error");
  });
}

app.prepare().then(() => {
  createServer(bufferHtml).listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
