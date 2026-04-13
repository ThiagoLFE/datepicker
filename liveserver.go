package main

import (
 "flag"
 "fmt"
 "io"
 "log"
 "net/http"
 "os"
 "path/filepath"
 "strings"
 "sync"
 "time"

 "github.com/fsnotify/fsnotify"
)

const injectedScript = `
<script>
const es = new EventSource('/__reload');
es.addEventListener('reload', () => location.reload());
</script>`

// --- SSE Hub ---

type hub struct {
 mu      sync.Mutex
 clients map[chan struct{}]struct{}
}

func newHub() *hub { return &hub{clients: make(map[chan struct{}]struct{})} }

func (h *hub) subscribe() chan struct{} {
 ch := make(chan struct{}, 1)
 h.mu.Lock()
 h.clients[ch] = struct{}{}
 h.mu.Unlock()
 return ch
}

func (h *hub) unsubscribe(ch chan struct{}) {
 h.mu.Lock()
 delete(h.clients, ch)
 h.mu.Unlock()
}

func (h *hub) broadcast() {
 h.mu.Lock()
 defer h.mu.Unlock()
 for ch := range h.clients {
  select {
  case ch <- struct{}{}:
  default:
  }
 }
}

func (h *hub) sseHandler(w http.ResponseWriter, r *http.Request) {
 w.Header().Set("Content-Type", "text/event-stream")
 w.Header().Set("Cache-Control", "no-cache")
 w.Header().Set("Connection", "keep-alive")

 flusher, ok := w.(http.Flusher)
 if !ok {
  http.Error(w, "streaming unsupported", http.StatusInternalServerError)
  return
 }

 ch := h.subscribe()
 defer h.unsubscribe(ch)

 ticker := time.NewTicker(15 * time.Second)
 defer ticker.Stop()

 for {
  select {
  case <-r.Context().Done():
   return
  case <-ch:
   fmt.Fprintf(w, "event: reload\ndata: {}\n\n")
   flusher.Flush()
  case <-ticker.C:
   fmt.Fprintf(w, ": ping\n\n")
   flusher.Flush()
  }
 }
}

// --- Inject middleware ---

type injectWriter struct {
 http.ResponseWriter
 buf    []byte
 isHTML bool
}

func (rw *injectWriter) WriteHeader(code int) {
 ct := rw.Header().Get("Content-Type")
 for _, mime := range []string{"text/html", "application/xhtml"} {
  if len(ct) >= len(mime) && ct[:len(mime)] == mime {
   rw.isHTML = true
   break
  }
 }
 rw.Header().Del("Content-Length")
 rw.ResponseWriter.WriteHeader(code)
}

func (rw *injectWriter) Write(b []byte) (int, error) {
 if !rw.isHTML {
  return rw.ResponseWriter.Write(b)
 }
 rw.buf = append(rw.buf, b...)
 return len(b), nil
}

func injectMiddleware(next http.Handler) http.Handler {
 return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
  iw := &injectWriter{ResponseWriter: w}
  next.ServeHTTP(iw, r)
  if !iw.isHTML {
   return
  }
  body := string(iw.buf)
  idx := strings.LastIndex(body, "</body>")
  if idx != -1 {
   body = body[:idx] + injectedScript + body[idx:]
  } else {
   body += injectedScript
  }
  io.WriteString(w, body)
 })
}

// --- fsnotify watcher with debounce ---

func watchDirs(h *hub, dirs ...string) error {
 watcher, err := fsnotify.NewWatcher()
 if err != nil {
  return err
 }

 for _, d := range dirs {
  if err := watcher.Add(d); err != nil {
   return fmt.Errorf("watching %s: %w", d, err)
  }
 }

 var (
  mu       sync.Mutex
  debounce *time.Timer
 )

 trigger := func() {
  mu.Lock()
  defer mu.Unlock()
  if debounce != nil {
   debounce.Stop()
  }
  debounce = time.AfterFunc(50*time.Millisecond, func() {
   log.Println("change detected, reloading...")
   h.broadcast()
  })
 }

 go func() {
  defer watcher.Close()
  for {
   select {
   case event, ok := <-watcher.Events:
    if !ok {
     return
    }
    if event.Has(fsnotify.Write) || event.Has(fsnotify.Create) || event.Has(fsnotify.Remove) {
     trigger()
    }
   case err, ok := <-watcher.Errors:
    if !ok {
     return
    }
    log.Println("watcher error:", err)
   }
  }
 }()

 return nil
}

// --- Main ---

func main() {
 port := flag.String("p", "8080", "port to listen on")
 flag.Parse()

 args := flag.Args()
 if len(args) < 1 {
  fmt.Fprintf(os.Stderr, "usage: %s [-p port] <dir> [dir2 ...]\n", filepath.Base(os.Args[0]))
  os.Exit(1)
 }

 dirs := args
 serveDir := dirs[0]
 addr := ":" + *port

 h := newHub()
 if err := watchDirs(h, dirs...); err != nil {
  log.Fatal(err)
 }

 mux := http.NewServeMux()
 mux.HandleFunc("GET /__reload", h.sseHandler)
 mux.Handle("/", injectMiddleware(http.FileServer(http.Dir(serveDir))))

 log.Printf("serving %s on http://localhost%s", serveDir, addr)
 if err := http.ListenAndServe(addr, mux); err != nil {
  log.Fatal(err)
 }
}
