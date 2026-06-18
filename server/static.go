package main

import (
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	"encoding/base64"
	"io"
	"io/fs"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/andybalholm/brotli"
)

// mimeTypes is an explicit allow-list: only these extensions are served, and we
// pin exact Content-Type strings rather than relying on the platform mime db.
var mimeTypes = map[string]string{
	".html":        "text/html; charset=utf-8",
	".js":          "text/javascript; charset=utf-8",
	".css":         "text/css; charset=utf-8",
	".svg":         "image/svg+xml",
	".ico":         "image/x-icon",
	".json":        "application/json; charset=utf-8",
	".webmanifest": "application/manifest+json",
	".woff2":       "font/woff2",
	".png":         "image/png",
}

// compressible marks the text types worth pre-compressing at boot.
var compressible = map[string]bool{
	".html": true, ".js": true, ".css": true, ".svg": true, ".json": true, ".webmanifest": true,
}

type asset struct {
	body        []byte
	br          []byte // nil unless pre-compressed
	gzip        []byte // nil unless pre-compressed
	contentType string
	etag        string
	immutable   bool
}

// staticServer holds every dist/ file in memory. dist/ is small and immutable
// inside the container, so we load it once at boot, precompute brotli/gzip
// variants for text assets, and serve from memory — no per-request fs.
type staticServer struct {
	assets map[string]*asset
	index  *asset
}

func loadAssets(distDir string) (*staticServer, error) {
	ss := &staticServer{assets: make(map[string]*asset)}
	err := filepath.WalkDir(distDir, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		ext := strings.ToLower(filepath.Ext(p))
		contentType, ok := mimeTypes[ext]
		if !ok {
			return nil // unknown type — not served
		}
		buf, err := os.ReadFile(p)
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(distDir, p)
		if err != nil {
			return err
		}
		urlPath := "/" + filepath.ToSlash(rel)
		sum := sha256.Sum256(buf)
		a := &asset{
			body:        buf,
			contentType: contentType,
			etag:        `"` + base64.RawURLEncoding.EncodeToString(sum[:]) + `"`,
			immutable:   strings.HasPrefix(urlPath, "/assets/"),
		}
		if compressible[ext] {
			a.br = brotliBytes(buf)
			a.gzip = gzipBytes(buf)
		}
		ss.assets[urlPath] = a
		return nil
	})
	if err != nil {
		return nil, err
	}
	ss.index = ss.assets["/index.html"]
	return ss, nil
}

// serve resolves an exact file, else falls back to index.html for client-side
// routes (extensionless GET/HEAD paths like /tables, /knockout). A missing path
// that looks like a file (has an extension) is a genuine 404 — matching sirv's
// single-page behaviour, so /assets/missing.js 404s rather than returning HTML.
func (ss *staticServer) serve(w http.ResponseWriter, r *http.Request) {
	urlPath := path.Clean(r.URL.Path)
	if urlPath == "/" {
		urlPath = "/index.html"
	}
	if a, ok := ss.assets[urlPath]; ok {
		ss.send(w, r, a)
		return
	}
	isNavigation := r.Method == http.MethodGet || r.Method == http.MethodHead
	if isNavigation && path.Ext(urlPath) == "" && ss.index != nil {
		ss.send(w, r, ss.index)
		return
	}
	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(http.StatusNotFound)
	if r.Method != http.MethodHead {
		io.WriteString(w, "Not found")
	}
}

// send writes an asset (or 304), honouring HEAD and conditional requests, and
// negotiating brotli/gzip from Accept-Encoding.
func (ss *staticServer) send(w http.ResponseWriter, r *http.Request, a *asset) {
	h := w.Header()
	h.Set("Content-Type", a.contentType)
	h.Set("ETag", a.etag)
	h.Set("Vary", "Accept-Encoding")
	if a.immutable {
		h.Set("Cache-Control", "public, max-age=31536000, immutable")
	} else {
		h.Set("Cache-Control", "no-cache")
	}
	if r.Header.Get("If-None-Match") == a.etag {
		w.WriteHeader(http.StatusNotModified)
		return
	}

	body := a.body
	accept := r.Header.Get("Accept-Encoding")
	switch {
	case a.br != nil && acceptsEncoding(accept, "br"):
		body = a.br
		h.Set("Content-Encoding", "br")
	case a.gzip != nil && acceptsEncoding(accept, "gzip"):
		body = a.gzip
		h.Set("Content-Encoding", "gzip")
	}
	h.Set("Content-Length", strconv.Itoa(len(body)))
	w.WriteHeader(http.StatusOK)
	if r.Method != http.MethodHead {
		w.Write(body)
	}
}

// acceptsEncoding reports whether the Accept-Encoding header lists enc as a
// token (ignoring q-values), so "br" doesn't spuriously match other values.
func acceptsEncoding(header, enc string) bool {
	for _, part := range strings.Split(header, ",") {
		token := strings.TrimSpace(part)
		if i := strings.IndexByte(token, ';'); i >= 0 {
			token = strings.TrimSpace(token[:i])
		}
		if strings.EqualFold(token, enc) {
			return true
		}
	}
	return false
}

func brotliBytes(b []byte) []byte {
	var buf bytes.Buffer
	w := brotli.NewWriterLevel(&buf, brotli.BestCompression)
	_, _ = w.Write(b)
	_ = w.Close()
	return buf.Bytes()
}

func gzipBytes(b []byte) []byte {
	var buf bytes.Buffer
	w, _ := gzip.NewWriterLevel(&buf, gzip.BestCompression)
	_, _ = w.Write(b)
	_ = w.Close()
	return buf.Bytes()
}
