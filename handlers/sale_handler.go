package handlers

import (
	"errors"
	"fmt"
	"go-pos/models"
	"go-pos/services"
	"go-pos/utils"
	"net/http"
)

type newSalePageData struct {
	Error    string
	Products []models.Product
}

type salesPageData struct {
	Sales []models.Sale
}

func SalesHandler(renderer *TemplateRenderer, saleService *services.SaleService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		renderer.Render(w, "sales.html", salesPageData{Sales: saleService.List()})
	}
}

func NewSaleHandler(renderer *TemplateRenderer, productService *services.ProductService, saleService *services.SaleService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			renderer.Render(w, "new_sale.html", newSalePageData{Products: productService.List()})
			return
		case http.MethodPost:
			if err := r.ParseForm(); err != nil {
				http.Error(w, "bad form", http.StatusBadRequest)
				return
			}

			products := productService.List()
			cart := make([]models.CartItem, 0, len(products))

			for _, product := range products {
				field := fmt.Sprintf("qty_%d", product.ID)
				qty, err := utils.OptionalIntFormValue(r, field)
				if err != nil {
					renderer.Render(w, "new_sale.html", newSalePageData{
						Error:    "Invalid quantity value(s)",
						Products: products,
					})
					return
				}
				if qty <= 0 {
					continue
				}

				cart = append(cart, models.CartItem{
					Product:  product,
					Quantity: qty,
				})
			}

			_, err := saleService.Create(cart)
			if err != nil {
				msg := "Failed to create sale"
				switch {
				case errors.Is(err, services.ErrInsufficientStock):
					msg = "Not enough stock for one or more items"
				case errors.Is(err, services.ErrEmptySale):
					msg = "Please enter at least one quantity"
				case errors.Is(err, services.ErrProductNotFound):
					msg = "A selected product was not found"
				}

				renderer.Render(w, "new_sale.html", newSalePageData{
					Error:    msg,
					Products: productService.List(),
				})
				return
			}

			http.Redirect(w, r, "/sales", http.StatusSeeOther)
			return
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
	}
}
