package storage

import (
	"encoding/json"
	"errors"
	"go-pos/models"
	"io"
	"os"
	"path/filepath"
	"sync"
)

type JSONStorage struct {
	dataDir string
	mu      sync.Mutex
}

func NewJSONStorage(dataDir string) *JSONStorage {
	return &JSONStorage{dataDir: dataDir}
}

func (s *JSONStorage) LoadProducts() ([]models.Product, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	var products []models.Product
	if err := s.loadJSON(filepath.Join(s.dataDir, "products.json"), &products); err != nil {
		return nil, err
	}
	return products, nil
}

func (s *JSONStorage) SaveProducts(products []models.Product) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.saveJSON(filepath.Join(s.dataDir, "products.json"), products)
}

func (s *JSONStorage) LoadSales() ([]models.Sale, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	var sales []models.Sale
	if err := s.loadJSON(filepath.Join(s.dataDir, "sales.json"), &sales); err != nil {
		return nil, err
	}
	return sales, nil
}

func (s *JSONStorage) SaveSales(sales []models.Sale) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.saveJSON(filepath.Join(s.dataDir, "sales.json"), sales)
}

func (s *JSONStorage) loadJSON(path string, dest any) error {
	file, err := os.Open(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil
		}
		return err
	}
	defer file.Close()

	if err := json.NewDecoder(file).Decode(dest); err != nil {
		if errors.Is(err, io.EOF) {
			return nil
		}
		return err
	}
	return nil
}

func (s *JSONStorage) saveJSON(path string, value any) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}

	tmpFile, err := os.CreateTemp(filepath.Dir(path), ".tmp-*.json")
	if err != nil {
		return err
	}

	tmpPath := tmpFile.Name()
	encoder := json.NewEncoder(tmpFile)
	encoder.SetIndent("", "  ")

	if err := encoder.Encode(value); err != nil {
		tmpFile.Close()
		_ = os.Remove(tmpPath)
		return err
	}

	if err := tmpFile.Close(); err != nil {
		_ = os.Remove(tmpPath)
		return err
	}

	_ = os.Remove(path)
	if err := os.Rename(tmpPath, path); err != nil {
		_ = os.Remove(tmpPath)
		return err
	}

	return nil
}
