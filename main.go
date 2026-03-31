package main

import (
	"embed"
	"fmt"
	"go-pos/handlers"
	"go-pos/services"
	"go-pos/storage"
	"io/fs"
	"log"
	"net/http"
	"os"
)

//go:embed templates/*.html static/css/*.css static/js/*.js
var webAssets embed.FS

func main() {
	store := storage.NewJSONStorage("data")

	productService, err := services.NewProductService(store)
	if err != nil {
		log.Fatal(err)
	}

	saleService, err := services.NewSaleService(store, productService)
	if err != nil {
		log.Fatal(err)
	}

	devMode := os.Getenv("GO_POS_DEV") == "1"

	var templatesFS fs.FS
	var staticFS fs.FS
	var renderer *handlers.TemplateRenderer

	if devMode {
		templatesFS = os.DirFS("templates")
		staticFS = os.DirFS("static")
		renderer = handlers.NewTemplateRendererFSNoCache(templatesFS)
	} else {
		templatesFS, err = fs.Sub(webAssets, "templates")
		if err != nil {
			log.Fatal(err)
		}
		staticFS, err = fs.Sub(webAssets, "static")
		if err != nil {
			log.Fatal(err)
		}
		renderer = handlers.NewTemplateRendererFS(templatesFS)
	}

	mux := http.NewServeMux()
	staticHandler := http.StripPrefix("/static/", http.FileServer(http.FS(staticFS)))
	if devMode {
		staticHandler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Cache-Control", "no-store")
			staticHandler.ServeHTTP(w, r)
		})
	}
	mux.Handle("/static/", staticHandler)
	mux.HandleFunc("/", handlers.HomeHandler(renderer))
	mux.HandleFunc("/products", handlers.ProductsHandler(renderer, productService))
	mux.HandleFunc("/products/add", handlers.AddProductHandler(renderer, productService))
	mux.HandleFunc("/sales", handlers.SalesHandler(renderer, saleService))
	mux.HandleFunc("/sale/new", handlers.NewSaleHandler(renderer, productService, saleService))

	fmt.Println("Server running on http://localhost:8080")
	if devMode {
		fmt.Println("Dev mode enabled: templates/static load from disk (GO_POS_DEV=1)")
	}
	log.Fatal(http.ListenAndServe(":8080", mux))
}
