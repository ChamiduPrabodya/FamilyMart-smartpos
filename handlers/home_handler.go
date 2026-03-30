package handlers

import (
	"html/template"
	"net/http"
	"path/filepath"
	"sync"
)

type TemplateRenderer struct {
	dir   string
	mu    sync.RWMutex
	cache map[string]*template.Template
}

func NewTemplateRenderer(dir string) *TemplateRenderer {
	return &TemplateRenderer{
		dir:   dir,
		cache: map[string]*template.Template{},
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

	tmpl, err := template.ParseFiles(filepath.Join(r.dir, name))
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
