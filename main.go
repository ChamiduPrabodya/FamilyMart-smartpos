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
)

//go:embed templates/*.html static/css/*.css
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

	templatesFS, err := fs.Sub(webAssets, "templates")
	if err != nil {
		log.Fatal(err)
	}
	staticFS, err := fs.Sub(webAssets, "static")
	if err != nil {
		log.Fatal(err)
	}

	renderer := handlers.NewTemplateRendererFS(templatesFS)

	mux := http.NewServeMux()
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.FS(staticFS))))
	mux.HandleFunc("/", handlers.HomeHandler(renderer))
	mux.HandleFunc("/products", handlers.ProductsHandler(renderer, productService))
	mux.HandleFunc("/products/add", handlers.AddProductHandler(renderer, productService))
	mux.HandleFunc("/sales", handlers.SalesHandler(renderer, saleService))
	mux.HandleFunc("/sale/new", handlers.NewSaleHandler(renderer, productService, saleService))

	fmt.Println("Server running on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", mux))
}
