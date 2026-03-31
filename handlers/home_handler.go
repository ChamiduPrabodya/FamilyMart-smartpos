package handlers

import (
	"html/template"
	"io/fs"
	"net/http"
	"os"
	"sync"
)

type TemplateRenderer struct {
	fs    fs.FS
	mu    sync.RWMutex
	cache map[string]*template.Template

	disableCache bool
}

func NewTemplateRenderer(dir string) *TemplateRenderer {
	return NewTemplateRendererFS(os.DirFS(dir))
}

func NewTemplateRendererNoCache(dir string) *TemplateRenderer {
	return NewTemplateRendererFSNoCache(os.DirFS(dir))
}

func NewTemplateRendererFS(fsys fs.FS) *TemplateRenderer {
	return &TemplateRenderer{
		fs:    fsys,
		cache: map[string]*template.Template{},
	}
}

func NewTemplateRendererFSNoCache(fsys fs.FS) *TemplateRenderer {
	return &TemplateRenderer{
		fs:           fsys,
		cache:        map[string]*template.Template{},
		disableCache: true,
	}
}

func (r *TemplateRenderer) Render(w http.ResponseWriter, name string, data any) {
	tmpl, err := r.get(name)
	if err != nil {
		http.Error(w, "template error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if err := tmpl.Execute(w, data); err != nil {
		http.Error(w, "render error: "+err.Error(), http.StatusInternalServerError)
		return
	}
}

func (r *TemplateRenderer) get(name string) (*template.Template, error) {
	if r.disableCache {
		return template.ParseFS(r.fs, name)
	}

	r.mu.RLock()
	cached := r.cache[name]
	r.mu.RUnlock()
	if cached != nil {
		return cached, nil
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	if cached := r.cache[name]; cached != nil {
		return cached, nil
	}

	tmpl, err := template.ParseFS(r.fs, name)
	if err != nil {
		return nil, err
	}

	r.cache[name] = tmpl
	return tmpl, nil
}

func HomeHandler(renderer *TemplateRenderer) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		renderer.Render(w, "index.html", nil)
	}
}
