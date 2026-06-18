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
// routes (extensionless paths like /tables, /knockout). A missing path that
// looks like a file (has an extension) is a genuine 404 — matching sirv's
// single-page behaviour, so /assets/missing.js 404s rather than returning HTML.
// Only GET/HEAD are served; other methods 404 like the previous sirv server.
func (ss *staticServer) serve(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		notFound(w, r)
		return
	}
	urlPath := path.Clean(r.URL.Path)
	if urlPath == "/" {
		urlPath = "/index.html"
	}
	if a, ok := ss.assets[urlPath]; ok {
		ss.send(w, r, a)
		return
	}
	if path.Ext(urlPath) == "" && ss.index != nil {
		ss.send(w, r, ss.index)
		return
	}
	notFound(w, r)
}

func notFound(w http.ResponseWriter, r *http.Request) {
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

// acceptsEncoding reports whether the Accept-Encoding header permits enc,
// honouring q-values (an explicit q=0 disables an encoding) and the "*"
// wildcard. An exact match wins over the wildcard; "br;q=0" is a refusal.
func acceptsEncoding(header, enc string) bool {
	wildcard, wildcardSet := false, false
	for _, part := range strings.Split(header, ",") {
		name, q := parseEncoding(part)
		if name == "" {
			continue
		}
		if strings.EqualFold(name, enc) {
			return q > 0
		}
		if name == "*" {
			wildcard, wildcardSet = q > 0, true
		}
	}
	if wildcardSet {
		return wildcard
	}
	return false
}

// parseEncoding splits one Accept-Encoding element into its coding name and
// q-value (defaulting to 1 when absent or unparseable).
func parseEncoding(part string) (name string, q float64) {
	token := strings.TrimSpace(part)
	q = 1
	if i := strings.IndexByte(token, ';'); i >= 0 {
		for _, p := range strings.Split(token[i+1:], ";") {
			p = strings.TrimSpace(p)
			if v, ok := strings.CutPrefix(p, "q="); ok {
				if parsed, err := strconv.ParseFloat(strings.TrimSpace(v), 64); err == nil {
					q = parsed
				}
			}
		}
		token = strings.TrimSpace(token[:i])
	}
	return token, q
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
