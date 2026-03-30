package services

import (
	"errors"
	"go-pos/models"
	"go-pos/storage"
	"strings"
	"sync"
)

var (
	ErrProductNotFound   = errors.New("product not found")
	ErrDuplicateProduct  = errors.New("product id already exists")
	ErrInvalidProduct    = errors.New("invalid product")
	ErrInsufficientStock = errors.New("insufficient stock")
)

type ProductService struct {
	store    *storage.JSONStorage
	mu       sync.RWMutex
	products []models.Product
}

func NewProductService(store *storage.JSONStorage) (*ProductService, error) {
	products, err := store.LoadProducts()
	if err != nil {
		return nil, err
	}

	return &ProductService{
		store:    store,
		products: products,
	}, nil
}

func (s *ProductService) List() []models.Product {
	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]models.Product, len(s.products))
	copy(out, s.products)
	return out
}

func (s *ProductService) FindByID(id int) (models.Product, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, product := range s.products {
		if product.ID == id {
			return product, true
		}
	}
	return models.Product{}, false
}

func (s *ProductService) Add(product models.Product) error {
	if product.ID <= 0 || strings.TrimSpace(product.Name) == "" || product.Price < 0 || product.Stock < 0 {
		return ErrInvalidProduct
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	for _, existing := range s.products {
		if existing.ID == product.ID {
			return ErrDuplicateProduct
		}
	}

	product.Name = strings.TrimSpace(product.Name)
	s.products = append(s.products, product)
	return s.store.SaveProducts(s.products)
}

func (s *ProductService) ApplyStockUpdate(items []models.CartItem) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	updated := make([]models.Product, len(s.products))
	copy(updated, s.products)

	for _, item := range items {
		if item.Quantity <= 0 {
			continue
		}

		found := false
		for i := range updated {
			if updated[i].ID != item.Product.ID {
				continue
			}

			found = true
			if updated[i].Stock < item.Quantity {
				return ErrInsufficientStock
			}
			updated[i].Stock -= item.Quantity
			break
		}

		if !found {
			return ErrProductNotFound
		}
	}

	if err := s.store.SaveProducts(updated); err != nil {
		return err
	}

	s.products = updated
	return nil
}
