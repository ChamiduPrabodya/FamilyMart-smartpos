package services

import (
	"errors"
	"go-pos/models"
	"go-pos/storage"
	"sync"
)

var ErrEmptySale = errors.New("sale must contain at least one item")

type SaleService struct {
	store          *storage.JSONStorage
	productService *ProductService

	mu    sync.RWMutex
	sales []models.Sale
}

func NewSaleService(store *storage.JSONStorage, productService *ProductService) (*SaleService, error) {
	sales, err := store.LoadSales()
	if err != nil {
		return nil, err
	}

	return &SaleService{
		store:          store,
		productService: productService,
		sales:          sales,
	}, nil
}

func (s *SaleService) List() []models.Sale {
	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]models.Sale, len(s.sales))
	copy(out, s.sales)
	return out
}

func (s *SaleService) Create(items []models.CartItem) (models.Sale, error) {
	filtered := make([]models.CartItem, 0, len(items))
	for _, item := range items {
		if item.Quantity <= 0 {
			continue
		}
		filtered = append(filtered, item)
	}
	if len(filtered) == 0 {
		return models.Sale{}, ErrEmptySale
	}

	var total float64
	for _, item := range filtered {
		total += item.Product.Price * float64(item.Quantity)
	}

	sale := models.Sale{Items: filtered, Total: total}

	// Best-effort consistency: update stock first, then persist sales.
	if err := s.productService.ApplyStockUpdate(filtered); err != nil {
		return models.Sale{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	updated := append(append([]models.Sale(nil), s.sales...), sale)
	if err := s.store.SaveSales(updated); err != nil {
		return models.Sale{}, err
	}

	s.sales = updated
	return sale, nil
}
