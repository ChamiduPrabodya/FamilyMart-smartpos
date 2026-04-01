package handlers

import (
	"errors"
	"go-pos/models"
	"go-pos/services"
	"go-pos/utils"
	"net/http"
)

type addProductPageData struct {
	Error string
}

func ProductsHandler(renderer *TemplateRenderer, productService *services.ProductService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		products := productService.List()
		renderer.Render(w, "products.html", products)
	}
}

func AddProductHandler(renderer *TemplateRenderer, productService *services.ProductService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			renderer.Render(w, "add_product.html", addProductPageData{})
			return
		case http.MethodPost:
			if err := r.ParseForm(); err != nil {
				http.Error(w, "bad form", http.StatusBadRequest)
				return
			}

			id, err := utils.IntFormValue(r, "id")
			if err != nil {
				renderer.Render(w, "add_product.html", addProductPageData{Error: "Invalid ID"})
				return
			}

			price, err := utils.FloatFormValue(r, "price")
			if err != nil {
				renderer.Render(w, "add_product.html", addProductPageData{Error: "Invalid price"})
				return
			}

			stock, err := utils.IntFormValue(r, "stock")
			if err != nil {
				renderer.Render(w, "add_product.html", addProductPageData{Error: "Invalid stock"})
				return
			}

			product := models.Product{
				ID:    id,
				Name:  r.FormValue("name"),
				Price: price,
				Stock: stock,
			}

			if err := productService.Add(product); err != nil {
				msg := "Failed to add product"
				if errors.Is(err, services.ErrDuplicateProduct) {
					msg = "Product ID already exists"
				} else if errors.Is(err, services.ErrInvalidProduct) {
					msg = "Please fill all fields with valid values"
				}
				renderer.Render(w, "add_product.html", addProductPageData{Error: msg})
				return
			}

			http.Redirect(w, r, "/products", http.StatusSeeOther)
			return
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
	}
}
