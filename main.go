package main

import (
	"fmt"
	"go-pos/handlers"
	"go-pos/services"
	"go-pos/storage"
	"net/http"
)

func main() {
	store := storage.NewJSONStorage("data")

	productService, err := services.NewProductService(store)
	if err != nil {
		panic(err)
	}

	saleService, err := services.NewSaleService(store, productService)
	if err != nil {
		panic(err)
	}

	renderer := handlers.NewTemplateRenderer("templates")

	mux := http.NewServeMux()
	mux.HandleFunc("/", handlers.HomeHandler(renderer))
	mux.HandleFunc("/products", handlers.ProductsHandler(renderer, productService))
	mux.HandleFunc("/products/add", handlers.AddProductHandler(renderer, productService))
	mux.HandleFunc("/sales", handlers.SalesHandler(renderer, saleService))
	mux.HandleFunc("/sale/new", handlers.NewSaleHandler(renderer, productService, saleService))

	fmt.Println("Server running on http://localhost:8080")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		panic(err)
	}
}
